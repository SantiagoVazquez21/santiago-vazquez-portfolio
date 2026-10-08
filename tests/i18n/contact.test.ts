import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "@/i18n";
import { MAX_LENGTH } from "@/lib/contact-validation";
import { fillTemplate, splitTemplate } from "@/lib/text-template";

const LANGS = ["es", "en"] as const;

const NAME_MAX = String(MAX_LENGTH.name);
const MESSAGE_MAX = String(MAX_LENGTH.message);

describe("contact texts (spec 005, annex A)", () => {
  it("match annex A in Spanish", () => {
    expect(DICTIONARIES.es.contact).toEqual({
      intro: "Respondo todos los mensajes por email.",
      requiredNote: "Todos los campos son obligatorios.",
      nameLabel: "Nombre",
      emailLabel: "Email",
      messageLabel: "Mensaje",
      submit: "Enviar",
      sending: "Enviando…",
      sent: "Mensaje enviado. Te responderé por email lo antes posible.",
      failed:
        "No se pudo enviar el mensaje. Lo escrito sigue en el formulario para volver a intentarlo.",
      failedAlternative: "También podés escribirme por {link}.",
      linkedinLink: "LinkedIn",
      linkedinLinkName: "LinkedIn, se abre en una pestaña nueva",
      rateLimited:
        "Hubo varios intentos seguidos. Podrás volver a intentarlo en unos minutos; lo escrito sigue en el formulario.",
      nameRequired: "El nombre es obligatorio.",
      nameTooLong: "El nombre puede tener hasta {max} caracteres.",
      emailRequired: "El email es obligatorio.",
      emailInvalid: "El email no es válido. Ejemplo: nombre@ejemplo.com",
      messageRequired: "El mensaje es obligatorio.",
      messageTooLong: "El mensaje puede tener hasta {max} caracteres.",
    });
  });

  it("match annex A in English", () => {
    expect(DICTIONARIES.en.contact).toEqual({
      intro: "I reply to every message by email.",
      requiredNote: "All fields are required.",
      nameLabel: "Name",
      emailLabel: "Email",
      messageLabel: "Message",
      submit: "Send",
      sending: "Sending…",
      sent: "Message sent. I'll reply by email as soon as possible.",
      failed:
        "The message couldn't be sent. Your text is still in the form so you can try again.",
      failedAlternative: "You can also reach me on {link}.",
      linkedinLink: "LinkedIn",
      linkedinLinkName: "LinkedIn, opens in a new tab",
      rateLimited:
        "There were several attempts in a row. You can try again in a few minutes; your text is still in the form.",
      nameRequired: "Name is required.",
      nameTooLong: "Name can be up to {max} characters long.",
      emailRequired: "Email is required.",
      emailInvalid: "The email isn't valid. Example: name@example.com",
      messageRequired: "Message is required.",
      messageTooLong: "Message can be up to {max} characters long.",
    });
  });
});

describe("contact length templates (RF-3, RF-15)", () => {
  it("fill in Spanish with the limits of RF-2", () => {
    const texts = DICTIONARIES.es.contact;
    expect(fillTemplate(texts.nameTooLong, { max: NAME_MAX })).toBe(
      "El nombre puede tener hasta 100 caracteres.",
    );
    expect(fillTemplate(texts.messageTooLong, { max: MESSAGE_MAX })).toBe(
      "El mensaje puede tener hasta 2000 caracteres.",
    );
  });

  it("fill in English with the limits of RF-2", () => {
    const texts = DICTIONARIES.en.contact;
    expect(fillTemplate(texts.nameTooLong, { max: NAME_MAX })).toBe(
      "Name can be up to 100 characters long.",
    );
    expect(fillTemplate(texts.messageTooLong, { max: MESSAGE_MAX })).toBe(
      "Message can be up to 2000 characters long.",
    );
  });

  it.each(LANGS)("leave no template marks behind in %s", (lang) => {
    const texts = DICTIONARIES[lang].contact;
    const filled = [
      fillTemplate(texts.nameTooLong, { max: NAME_MAX }),
      fillTemplate(texts.messageTooLong, { max: MESSAGE_MAX }),
    ];
    for (const text of filled) {
      expect(text).not.toMatch(/[{}]/);
    }
  });
});

describe("contact LinkedIn alternative (RF-8, RF-15)", () => {
  it("splits the Spanish sentence around the link", () => {
    expect(
      splitTemplate(DICTIONARIES.es.contact.failedAlternative, "link"),
    ).toEqual({ before: "También podés escribirme por ", after: "." });
  });

  it("splits the English sentence around the link", () => {
    expect(
      splitTemplate(DICTIONARIES.en.contact.failedAlternative, "link"),
    ).toEqual({ before: "You can also reach me on ", after: "." });
  });

  it.each(LANGS)("leaves no template marks in the %s parts", (lang) => {
    const { before, after } = splitTemplate(
      DICTIONARIES[lang].contact.failedAlternative,
      "link",
    );
    expect(`${before}${after}`).not.toMatch(/[{}]/);
  });

  it.each(LANGS)(
    "the %s accessible name starts with the visible link text",
    (lang) => {
      const texts = DICTIONARIES[lang].contact;
      expect(texts.linkedinLinkName.startsWith(texts.linkedinLink)).toBe(true);
    },
  );
});
