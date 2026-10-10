import { describe, expect, it } from "vitest";
import { CONTENT } from "@/content";
import { LOGO_CREDITS } from "@/content/catalog";
import { DICTIONARIES } from "@/i18n";
import { fillTemplate } from "@/lib/text-template";

const LANGS = ["es", "en"] as const;

describe("sections texts (spec 004 annex B, spec 006 annex A, spec 008 annex B, spec 009 texts table)", () => {
  it("match the annexes in Spanish", () => {
    expect(DICTIONARIES.es.sections).toEqual({
      technologies: "Tecnologías",
      repository: "Repositorio",
      repositoryName: "Repositorio de {project}, se abre en una pestaña nueva",
      languages: "Idiomas",
      separator: " · ",
      back: "Volver",
      pause: "Pausar",
      resume: "Reanudar",
      folderGroup: "Carpetas de habilidades",
      projectGroup: "Tarjetas de proyectos",
      projectOpenHint: "Abrí un proyecto con doble clic, Enter o un toque.",
      projectTags: "Contexto",
      contribution: "Mi aporte",
      features: "Funcionalidades principales",
      logoCredit: "Logo de {brand} por {author} (color aplicado),",
      logoLicenseName:
        "Licencia {license} del logo de {brand}, se abre en una pestaña nueva",
      certificate: "Certificado",
      certificateName: "Certificado de {study}",
      certificateViewerName: "Certificado de {study}, documento PDF",
      certificateOpen: "Abrir / Descargar PDF",
      certificateOpenName:
        "Abrir / Descargar PDF del certificado de {study}, se abre en una pestaña nueva",
      certificateNoViewer:
        "No se puede mostrar el PDF dentro de la ventana. Abrilo o descargalo con el botón «Abrir / Descargar PDF».",
    });
  });

  it("match the annexes in English", () => {
    expect(DICTIONARIES.en.sections).toEqual({
      technologies: "Technologies",
      repository: "Repository",
      repositoryName: "{project} repository, opens in a new tab",
      languages: "Languages",
      separator: " · ",
      back: "Back",
      pause: "Pause",
      resume: "Resume",
      folderGroup: "Skill folders",
      projectGroup: "Project cards",
      projectOpenHint: "Open a project with a double-click, Enter or a tap.",
      projectTags: "Context",
      contribution: "My contribution",
      features: "Main features",
      logoCredit: "{brand} logo by {author} (color applied),",
      logoLicenseName:
        "{license} license for the {brand} logo, opens in a new tab",
      certificate: "Certificate",
      certificateName: "Certificate for {study}",
      certificateViewerName: "Certificate for {study}, PDF document",
      certificateOpen: "Open / Download PDF",
      certificateOpenName:
        "Open / Download PDF of the certificate for {study}, opens in a new tab",
      certificateNoViewer:
        "The PDF can't be shown inside the window. Open or download it with the “Open / Download PDF” button.",
    });
  });
});

describe("repository name template (spec 008 RF-6)", () => {
  it("fills in with Gestion Pro as annex B shows", () => {
    const values = { project: "Gestion Pro" };
    expect(fillTemplate(DICTIONARIES.es.sections.repositoryName, values)).toBe(
      "Repositorio de Gestion Pro, se abre en una pestaña nueva",
    );
    expect(fillTemplate(DICTIONARIES.en.sections.repositoryName, values)).toBe(
      "Gestion Pro repository, opens in a new tab",
    );
  });
});

describe("certificate name templates (spec 009 RF-12)", () => {
  const STUDY = {
    es: "Técnico en Informática Personal y Profesional",
    en: "IT Technician",
  } as const;

  it("use the IT Technician title from the content as the study", () => {
    expect(CONTENT.es.studies.itTechnician.title).toBe(STUDY.es);
    expect(CONTENT.en.studies.itTechnician.title).toBe(STUDY.en);
  });

  it("fill in with the IT Technician as the texts table shows in Spanish", () => {
    const texts = DICTIONARIES.es.sections;
    const values = { study: STUDY.es };
    expect(fillTemplate(texts.certificateName, values)).toBe(
      "Certificado de Técnico en Informática Personal y Profesional",
    );
    expect(fillTemplate(texts.certificateViewerName, values)).toBe(
      "Certificado de Técnico en Informática Personal y Profesional, documento PDF",
    );
    expect(fillTemplate(texts.certificateOpenName, values)).toBe(
      "Abrir / Descargar PDF del certificado de Técnico en Informática Personal y Profesional, se abre en una pestaña nueva",
    );
  });

  it("fill in with the IT Technician as the texts table shows in English", () => {
    const texts = DICTIONARIES.en.sections;
    const values = { study: STUDY.en };
    expect(fillTemplate(texts.certificateName, values)).toBe(
      "Certificate for IT Technician",
    );
    expect(fillTemplate(texts.certificateViewerName, values)).toBe(
      "Certificate for IT Technician, PDF document",
    );
    expect(fillTemplate(texts.certificateOpenName, values)).toBe(
      "Open / Download PDF of the certificate for IT Technician, opens in a new tab",
    );
  });

  it.each(LANGS)(
    "start each accessible name with its visible text in %s",
    (lang) => {
      const texts = DICTIONARIES[lang].sections;
      const values = { study: STUDY[lang] };
      const name = fillTemplate(texts.certificateName, values).toLowerCase();
      const openName = fillTemplate(
        texts.certificateOpenName,
        values,
      ).toLowerCase();
      expect(name.startsWith(texts.certificate.toLowerCase())).toBe(true);
      expect(openName.startsWith(texts.certificateOpen.toLowerCase())).toBe(
        true,
      );
    },
  );
});

describe("logo credit templates (RF-15)", () => {
  it("fill in with PHP and Git as annex B shows", () => {
    const values = { brand: "PHP", author: "Colin Viebrock" };
    expect(fillTemplate(DICTIONARIES.es.sections.logoCredit, values)).toBe(
      "Logo de PHP por Colin Viebrock (color aplicado),",
    );
    expect(fillTemplate(DICTIONARIES.en.sections.logoCredit, values)).toBe(
      "PHP logo by Colin Viebrock (color applied),",
    );
    const license = { license: "CC BY 3.0", brand: "Git" };
    expect(
      fillTemplate(DICTIONARIES.es.sections.logoLicenseName, license),
    ).toBe("Licencia CC BY 3.0 del logo de Git, se abre en una pestaña nueva");
    expect(
      fillTemplate(DICTIONARIES.en.sections.logoLicenseName, license),
    ).toBe("CC BY 3.0 license for the Git logo, opens in a new tab");
  });

  describe.each(LANGS)("with the %s content", (lang) => {
    const texts = DICTIONARIES[lang].sections;
    const content = CONTENT[lang];

    it.each(LOGO_CREDITS.map((credit) => credit.id))(
      "names the brand, author and license of %s with nothing left to fill",
      (id) => {
        const brand = content.skills[id];
        const { author, license } = content.logoCredits[id];
        const credit = fillTemplate(texts.logoCredit, { brand, author });
        const name = fillTemplate(texts.logoLicenseName, { license, brand });
        expect(credit).toContain(brand);
        expect(credit).toContain(author);
        expect(name).toContain(brand);
        expect(name).toContain(license);
        expect(`${credit} ${name}`).not.toMatch(/[{}‹›]/);
      },
    );
  });
});
