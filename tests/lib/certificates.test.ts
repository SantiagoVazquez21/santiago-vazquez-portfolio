import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_PROBLEM,
  CERTIFICATES_PATH,
  certificateAssignmentProblems,
  certificateForStudy,
  certificateHref,
  PDF_DISPLAY,
  PDF_LOAD_ERROR_EVENT,
  pdfDisplayMode,
  unassignedCertificateFiles,
  unexpectedPdfs,
} from "@/lib/certificates";
import { classifySegment } from "@/lib/locale";

describe("CERTIFICATES_PATH", () => {
  it("is the fixed public folder", () => {
    expect(CERTIFICATES_PATH).toBe("/certificates/");
  });

  it("has a first segment the proxy never takes for a language", () => {
    const firstSegment = CERTIFICATES_PATH.split("/")[1];
    expect(classifySegment(firstSegment)).toEqual({ kind: "notLanguage" });
  });
});

describe("certificateHref", () => {
  it("builds the public path for a valid file name", () => {
    expect(certificateHref("analitico-tecnico.pdf")).toBe(
      "/certificates/analitico-tecnico.pdf",
    );
  });

  it.each(["Analitico_Tecnico-2024.pdf", "A.pdf", "0.pdf", "a_b-c.pdf"])(
    "accepts %j (letters, digits, '_' and '-')",
    (fileName) => {
      expect(certificateHref(fileName)).toBe(`/certificates/${fileName}`);
    },
  );

  it.each([
    "",
    ".pdf",
    "a.PDF",
    "a.pdf.exe",
    "a",
    "../a.pdf",
    "a/b.pdf",
    "/a.pdf",
    "a b.pdf",
    "a%20b.pdf",
    "https://x.com/a.pdf",
    "-a.pdf",
  ])("rejects %j", (fileName) => {
    expect(certificateHref(fileName)).toBeNull();
  });
});

describe("certificateForStudy", () => {
  it("gives no certificate to a study in progress, even with a file (RF-1)", () => {
    expect(
      certificateForStudy({ hasStatus: true, certificateFile: "a.pdf" }),
    ).toBeNull();
  });

  it("gives no certificate to a finished study without a file (RF-3)", () => {
    expect(
      certificateForStudy({ hasStatus: false, certificateFile: null }),
    ).toBeNull();
  });

  it("gives the public path to a finished study with a valid file", () => {
    expect(
      certificateForStudy({
        hasStatus: false,
        certificateFile: "analitico-tecnico.pdf",
      }),
    ).toBe("/certificates/analitico-tecnico.pdf");
  });

  it("gives no certificate to a finished study with an invalid file name", () => {
    expect(
      certificateForStudy({ hasStatus: false, certificateFile: "../a.pdf" }),
    ).toBeNull();
  });

  it("does not mutate its input", () => {
    const study = Object.freeze({
      hasStatus: false,
      certificateFile: "a.pdf",
    });
    certificateForStudy(study);
    expect(study).toEqual({ hasStatus: false, certificateFile: "a.pdf" });
  });
});

describe("pdfDisplayMode", () => {
  it("shows only the link when the browser says it has no PDF viewer (RF-8)", () => {
    expect(pdfDisplayMode(false, false)).toBe(PDF_DISPLAY.linkOnly);
  });

  it.each([true, undefined, false])(
    "shows only the link when loading failed (pdfViewerEnabled %j)",
    (pdfViewerEnabled) => {
      expect(pdfDisplayMode(pdfViewerEnabled, true)).toBe(PDF_DISPLAY.linkOnly);
    },
  );

  it.each([true, undefined, null, 0, "false"])(
    "embeds the PDF otherwise (pdfViewerEnabled %j)",
    (pdfViewerEnabled) => {
      expect(pdfDisplayMode(pdfViewerEnabled, false)).toBe(
        PDF_DISPLAY.embedded,
      );
    },
  );

  it("exposes exactly the two display modes", () => {
    expect(PDF_DISPLAY).toEqual({ embedded: "embedded", linkOnly: "linkOnly" });
  });
});

describe("PDF_LOAD_ERROR_EVENT", () => {
  it("is the DOM event an <object> fires when its PDF fails to load (RF-8, D9)", () => {
    expect(PDF_LOAD_ERROR_EVENT).toBe("error");
  });
});

describe("CERTIFICATE_PROBLEM", () => {
  it("exposes exactly the three assignment problems", () => {
    expect(CERTIFICATE_PROBLEM).toEqual({
      inProgress: "inProgress",
      invalidName: "invalidName",
      missingFile: "missingFile",
    });
  });
});

describe("certificateAssignmentProblems", () => {
  it.each([[[]], [["a.pdf"]], [["a.pdf", ".DS_Store"]]])(
    "finds nothing in an empty catalog (folder %j)",
    (folderFiles) => {
      expect(certificateAssignmentProblems([], folderFiles)).toEqual([]);
    },
  );

  it.each([[[]], [["a.pdf"]], [["prueba-certificado.pdf", ".DS_Store"]]])(
    "finds nothing when every study is unassigned (folder %j)",
    (folderFiles) => {
      const studies = [
        { id: "a", hasStatus: true, certificateFile: null },
        { id: "b", hasStatus: false, certificateFile: null },
      ];
      expect(certificateAssignmentProblems(studies, folderFiles)).toEqual([]);
    },
  );

  it("finds nothing for a finished study whose file is in the folder", () => {
    const studies = [{ id: "a", hasStatus: false, certificateFile: "a.pdf" }];
    expect(certificateAssignmentProblems(studies, ["a.pdf"])).toEqual([]);
  });

  it("flags a study in progress with a certificate, even if the file exists", () => {
    const studies = [{ id: "b", hasStatus: true, certificateFile: "b.pdf" }];
    expect(certificateAssignmentProblems(studies, ["b.pdf"])).toEqual([
      { id: "b", problem: CERTIFICATE_PROBLEM.inProgress },
    ]);
  });

  it("flags an invalid file name", () => {
    const studies = [
      { id: "c", hasStatus: false, certificateFile: "../c.pdf" },
    ];
    expect(certificateAssignmentProblems(studies, ["../c.pdf"])).toEqual([
      { id: "c", problem: CERTIFICATE_PROBLEM.invalidName },
    ]);
  });

  it("flags a valid file name missing from the folder", () => {
    const studies = [{ id: "d", hasStatus: false, certificateFile: "d.pdf" }];
    expect(certificateAssignmentProblems(studies, ["e.pdf"])).toEqual([
      { id: "d", problem: CERTIFICATE_PROBLEM.missingFile },
    ]);
  });

  it("gives one problem per study, in order, and skips correct ones", () => {
    const studies = [
      { id: "inProgress", hasStatus: true, certificateFile: "b.pdf" },
      { id: "ok", hasStatus: false, certificateFile: "a.pdf" },
      { id: "invalid", hasStatus: false, certificateFile: "../c.pdf" },
      { id: "unassigned", hasStatus: false, certificateFile: null },
      { id: "missing", hasStatus: false, certificateFile: "d.pdf" },
      { id: "inProgressInvalid", hasStatus: true, certificateFile: "x/y.pdf" },
    ];
    expect(certificateAssignmentProblems(studies, ["a.pdf", "b.pdf"])).toEqual([
      { id: "inProgress", problem: CERTIFICATE_PROBLEM.inProgress },
      { id: "invalid", problem: CERTIFICATE_PROBLEM.invalidName },
      { id: "missing", problem: CERTIFICATE_PROBLEM.missingFile },
      { id: "inProgressInvalid", problem: CERTIFICATE_PROBLEM.inProgress },
    ]);
  });

  it("does not mutate its inputs", () => {
    const studies = Object.freeze([
      Object.freeze({ id: "a", hasStatus: true, certificateFile: "a.pdf" }),
      Object.freeze({ id: "b", hasStatus: false, certificateFile: "b.pdf" }),
    ]);
    const folderFiles = Object.freeze(["a.pdf"]);
    certificateAssignmentProblems(studies, folderFiles);
    expect(studies).toEqual([
      { id: "a", hasStatus: true, certificateFile: "a.pdf" },
      { id: "b", hasStatus: false, certificateFile: "b.pdf" },
    ]);
    expect(folderFiles).toEqual(["a.pdf"]);
  });
});

describe("unassignedCertificateFiles", () => {
  const unassigned = [
    { hasStatus: true, certificateFile: null },
    { hasStatus: false, certificateFile: null },
  ];

  it("finds nothing with every study unassigned and an empty folder", () => {
    expect(unassignedCertificateFiles(unassigned, [])).toEqual([]);
  });

  it("finds a forgotten test PDF when every study is unassigned", () => {
    expect(
      unassignedCertificateFiles(unassigned, ["prueba-certificado.pdf"]),
    ).toEqual(["prueba-certificado.pdf"]);
  });

  it("finds every file no study names, of any extension, in order", () => {
    const studies = [
      { hasStatus: false, certificateFile: "a.pdf" },
      { hasStatus: true, certificateFile: null },
    ];
    expect(
      unassignedCertificateFiles(studies, [
        "a.pdf",
        "olvidado.pdf",
        ".DS_Store",
      ]),
    ).toEqual(["olvidado.pdf", ".DS_Store"]);
  });

  it("finds nothing when every file in the folder is assigned", () => {
    const studies = [
      { hasStatus: false, certificateFile: "a.pdf" },
      { hasStatus: false, certificateFile: "b.pdf" },
    ];
    expect(unassignedCertificateFiles(studies, ["b.pdf", "a.pdf"])).toEqual([]);
  });

  it("does not mutate its inputs", () => {
    const studies = Object.freeze([
      Object.freeze({ hasStatus: false, certificateFile: "a.pdf" }),
    ]);
    const folderFiles = Object.freeze(["a.pdf", "b.pdf"]);
    unassignedCertificateFiles(studies, folderFiles);
    expect(studies).toEqual([{ hasStatus: false, certificateFile: "a.pdf" }]);
    expect(folderFiles).toEqual(["a.pdf", "b.pdf"]);
  });
});

describe("unexpectedPdfs", () => {
  it("finds a PDF outside the allowed ones, ignoring case", () => {
    expect(
      unexpectedPdfs(
        ["CV.pdf", "certificates/a.pdf", "icons/x.svg", "otra/copia.PDF"],
        ["CV.pdf", "certificates/a.pdf"],
      ),
    ).toEqual(["otra/copia.PDF"]);
  });

  it("finds nothing without PDFs", () => {
    expect(unexpectedPdfs(["icons/x.svg", "favicon.ico"], [])).toEqual([]);
  });

  it("finds nothing when every PDF is allowed", () => {
    expect(
      unexpectedPdfs(
        ["CV.pdf", "icons/x.svg", "certificates/a.pdf"],
        ["CV.pdf", "certificates/a.pdf"],
      ),
    ).toEqual([]);
  });

  it("finds a certificate that is not allowed, in order", () => {
    expect(
      unexpectedPdfs(
        ["certificates/b.pdf", "CV.pdf", "certificates/a.pdf", "z.Pdf"],
        ["CV.pdf", "certificates/a.pdf"],
      ),
    ).toEqual(["certificates/b.pdf", "z.Pdf"]);
  });

  it("does not mutate its inputs", () => {
    const publicFiles = Object.freeze(["CV.pdf", "x.pdf"]);
    const allowedPdfs = Object.freeze(["CV.pdf"]);
    unexpectedPdfs(publicFiles, allowedPdfs);
    expect(publicFiles).toEqual(["CV.pdf", "x.pdf"]);
    expect(allowedPdfs).toEqual(["CV.pdf"]);
  });
});

describe("certificates module boundaries", () => {
  it("imports neither React, Next nor src/content", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "lib", "certificates.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["'](react|next)(\/|["'])/);
    expect(source).not.toMatch(/["']@\/content\//);
    expect(source).not.toMatch(/["'][./]*\/content\//);
  });

  it("never reads the file system", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "lib", "certificates.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["'](node:)?(fs|path)(\/promises)?["']/);
    expect(source).not.toMatch(/\brequire\s*\(/);
  });
});
