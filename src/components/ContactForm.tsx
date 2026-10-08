"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type { Dictionary } from "@/i18n/types";
import {
  AUTOCOMPLETE,
  CLIENT_TIMEOUT_MS,
  CONTACT_ENDPOINT,
  EMPTY_FORM,
  applyOutcome,
  buildContactRequest,
  editField,
  errorTextKey,
  FAILED_OUTCOME,
  focusAfterOutcome,
  isSending,
  LINKEDIN_LINK_KEY,
  parseContactResponse,
  readHoneypot,
  statusMessages,
  submitForm,
  type ContactOutcome,
  type FormState,
} from "@/lib/contact-form";
import {
  CONTACT_FIELDS,
  HONEYPOT_FIELD,
  MAX_LENGTH,
  type ContactField,
  type ContactValues,
} from "@/lib/contact-validation";
import { LINKEDIN_URL } from "@/lib/desktop-catalog";
import { fillTemplate, splitTemplate } from "@/lib/text-template";

// Named from the shared list, so no field name is written as a literal here (plan, section 10).
const [NAME, EMAIL, MESSAGE] = CONTACT_FIELDS;

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

type ContactFormProps = {
  texts: Dictionary["contact"];
};

// Local state: minimizing or maximizing keeps the window mounted and closing unmounts it,
// so the text survives the first and starts empty after the second (RF-14, plan 004, D3).
export function ContactForm({ texts }: ContactFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // A state-held Map keeps one instance across renders without reading a ref while rendering.
  const [fieldElements] = useState(() => new Map<ContactField, FieldElement>());
  // Set by a submit and applied once its render is committed, when the error exists.
  const pendingFocus = useRef<ContactField | null>(null);
  // Two bases, so an input and its error never share an id without a literal suffix.
  const inputBase = useId();
  const errorBase = useId();
  const sending = isSending(form);
  const messages = statusMessages(form.status);

  useEffect(() => {
    const field = pendingFocus.current;
    if (field === null) return;
    pendingFocus.current = null;
    fieldElements.get(field)?.focus();
  });

  function registerField(field: ContactField) {
    return (element: FieldElement | null) => {
      if (element === null) {
        fieldElements.delete(field);
      } else {
        fieldElements.set(field, element);
      }
    };
  }

  function handleChange(field: ContactField) {
    return (event: ChangeEvent<FieldElement>) => {
      const value = event.currentTarget.value;
      setForm((current) => editField(current, field, value));
    };
  }

  // Any network error, timeout or unreadable body counts as a failed send (RF-8). If the window
  // was closed meanwhile, the final setForm lands on an unmounted component and does nothing.
  async function send(values: ContactValues, honeypot: string) {
    let outcome: ContactOutcome;
    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        ...buildContactRequest(values, honeypot),
        signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
      });
      const body: unknown = await response.json().catch(() => null);
      outcome = parseContactResponse(response.status, body);
    } catch {
      outcome = FAILED_OUTCOME;
    }
    pendingFocus.current = focusAfterOutcome(outcome);
    setForm((current) => applyOutcome(current, outcome));
  }

  // noValidate on the form: the browser's own messages would skip the dictionaries (plan, D7).
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = submitForm(form);
    setForm(result.state);
    pendingFocus.current = result.focus;
    if (result.send) {
      // Read from the DOM, not from state: the trap is uncontrolled (plan, D9).
      const honeypot = readHoneypot(new FormData(event.currentTarget));
      void send(result.state.values, honeypot);
    }
  }

  function errorText(field: ContactField): string | null {
    const error = form.errors[field];
    if (error === undefined) return null;
    return fillTemplate(texts[errorTextKey(field, error)], {
      max: String(MAX_LENGTH[field]),
    });
  }

  // The props every field shares: its label's target, its error as description (RF-3).
  function fieldProps(field: ContactField) {
    const invalid = form.errors[field] !== undefined;
    return {
      // readOnly keeps the focus and the text where they are, unlike disabled (RF-6).
      readOnly: sending,
      ref: registerField(field),
      id: inputBase + field,
      name: field,
      autoComplete: AUTOCOMPLETE[field],
      value: form.values[field],
      onChange: handleChange(field),
      "aria-invalid": invalid,
      "aria-describedby": invalid ? errorBase + field : undefined,
    };
  }

  // Shown after the send error only; "too many sends" has no link (RF-8, RF-11).
  function linkedinAlternative() {
    const { before, after } = splitTemplate(
      texts.failedAlternative,
      LINKEDIN_LINK_KEY,
    );
    return (
      <>
        {" "}
        {before}
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={texts.linkedinLinkName}
          className="text-[#000080] underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black focus-visible:outline-dotted"
        >
          {texts.linkedinLink}
        </a>
        {after}
      </>
    );
  }

  function fieldError(field: ContactField) {
    const text = errorText(field);
    return (
      text !== null && (
        <p id={errorBase + field} className="mt-1 text-sm text-[#800000]">
          {text}
        </p>
      )
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-2">
      <p>{texts.intro}</p>
      <p className="mt-2">{texts.requiredNote}</p>
      <div className="mt-3">
        <label htmlFor={inputBase + NAME} className="block font-bold">
          {texts.nameLabel}
        </label>
        <input
          type="text"
          {...fieldProps(NAME)}
          className="mt-1 w-full border-2 border-t-[#404040] border-r-[#808080] border-b-[#808080] border-l-[#404040] bg-white px-1 py-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black focus-visible:outline-dotted"
        />
        {fieldError(NAME)}
      </div>
      <div className="mt-3">
        <label htmlFor={inputBase + EMAIL} className="block font-bold">
          {texts.emailLabel}
        </label>
        <input
          type="email"
          {...fieldProps(EMAIL)}
          className="mt-1 w-full border-2 border-t-[#404040] border-r-[#808080] border-b-[#808080] border-l-[#404040] bg-white px-1 py-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black focus-visible:outline-dotted"
        />
        {fieldError(EMAIL)}
      </div>
      <div className="mt-3">
        <label htmlFor={inputBase + MESSAGE} className="block font-bold">
          {texts.messageLabel}
        </label>
        <textarea
          rows={6}
          {...fieldProps(MESSAGE)}
          className="mt-1 block w-full resize-y border-2 border-t-[#404040] border-r-[#808080] border-b-[#808080] border-l-[#404040] bg-white px-1 py-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black focus-visible:outline-dotted"
        />
        {fieldError(MESSAGE)}
      </div>
      {/* Uncontrolled and read only when sending, so a bot that sets .value fills it too (plan, D9).
          Off-screen instead of display:none, which some bots detect (RF-10). */}
      <div
        aria-hidden="true"
        className="absolute -left-[10000px] h-px w-px overflow-hidden"
      >
        <input
          type="text"
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete={AUTOCOMPLETE.off}
        />
      </div>
      {/* aria-disabled, not disabled: a disabled button drops the focus to the body (plan, D6).
          While sending it stays sunken with black text: Win95 grey text fails 4.5:1 (RNF-2). */}
      <button
        type="submit"
        aria-disabled={sending}
        className={
          sending
            ? "mt-3 cursor-not-allowed border-2 border-t-black border-r-white border-b-white border-l-black bg-[#C0C0C0] px-4 py-1 text-black focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted"
            : "mt-3 border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] px-4 py-1 text-black focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
        }
      >
        {sending ? texts.sending : texts.submit}
      </button>
      {/* Both regions always exist, so screen readers announce their new text (plan, D8). */}
      <p role="status" className="mt-3">
        {messages.status !== null && texts[messages.status]}
      </p>
      <p role="alert" className="mt-3">
        {messages.alert !== null && texts[messages.alert]}
        {messages.offerLinkedin && linkedinAlternative()}
      </p>
    </form>
  );
}
