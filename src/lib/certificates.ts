// Fixed public folder; a two-letter name would be taken for a language by the proxy.
export const CERTIFICATES_PATH = "/certificates/";

// Own file name only: no "/", "..", spaces or "%", so it cannot leave the folder or need encoding.
const CERTIFICATE_FILE = /^[A-Za-z0-9][A-Za-z0-9_-]*\.pdf$/;

export function certificateHref(fileName: string): string | null {
  return CERTIFICATE_FILE.test(fileName) ? CERTIFICATES_PATH + fileName : null;
}

export type CertificateSource = Readonly<{
  hasStatus: boolean;
  certificateFile: string | null;
}>;

export function certificateForStudy(study: CertificateSource): string | null {
  // A study with a status is still in progress, so it has no certificate yet.
  if (study.hasStatus) return null;
  if (study.certificateFile === null) return null;
  return certificateHref(study.certificateFile);
}

export const PDF_DISPLAY = {
  embedded: "embedded",
  linkOnly: "linkOnly",
} as const;
export type PdfDisplay = (typeof PDF_DISPLAY)[keyof typeof PDF_DISPLAY];

export function pdfDisplayMode(
  pdfViewerEnabled: unknown,
  loadFailed: boolean,
): PdfDisplay {
  if (loadFailed) return PDF_DISPLAY.linkOnly;
  // Only an explicit false means "no viewer"; older browsers report undefined and still try.
  if (pdfViewerEnabled === false) return PDF_DISPLAY.linkOnly;
  return PDF_DISPLAY.embedded;
}

// The viewer listens for it by hand (plan, D9); kept here because a string in a component
// would be taken for visible text by the lint.
export const PDF_LOAD_ERROR_EVENT = "error";

// Control rules: the catalog tests apply them to the real data and public/, this module's
// tests to sample data (RF-1, RF-14, RNF-5). File lists come in as parameters.
export type CertificateAssignment = CertificateSource &
  Readonly<{ id: string }>;

export const CERTIFICATE_PROBLEM = {
  inProgress: "inProgress",
  invalidName: "invalidName",
  missingFile: "missingFile",
} as const;
export type CertificateProblem =
  (typeof CERTIFICATE_PROBLEM)[keyof typeof CERTIFICATE_PROBLEM];

type CertificateAssignmentProblem = Readonly<{
  id: string;
  problem: CertificateProblem;
}>;

function assignmentProblem(
  study: CertificateAssignment,
  certificateFile: string,
  folderFiles: readonly string[],
): CertificateProblem | null {
  if (study.hasStatus) return CERTIFICATE_PROBLEM.inProgress;
  if (certificateHref(certificateFile) === null) {
    return CERTIFICATE_PROBLEM.invalidName;
  }
  if (!folderFiles.includes(certificateFile)) {
    return CERTIFICATE_PROBLEM.missingFile;
  }
  return null;
}

export function certificateAssignmentProblems(
  studies: readonly CertificateAssignment[],
  folderFiles: readonly string[],
): readonly CertificateAssignmentProblem[] {
  const problems: CertificateAssignmentProblem[] = [];
  for (const study of studies) {
    if (study.certificateFile === null) continue;
    const problem = assignmentProblem(
      study,
      study.certificateFile,
      folderFiles,
    );
    if (problem !== null) problems.push({ id: study.id, problem });
  }
  return problems;
}

// The folder may only hold assigned files, so a forgotten test PDF or ".DS_Store" shows up.
export function unassignedCertificateFiles(
  studies: readonly CertificateSource[],
  folderFiles: readonly string[],
): readonly string[] {
  const assigned = new Set(studies.map((study) => study.certificateFile));
  return folderFiles.filter((file) => !assigned.has(file));
}

const PDF_EXTENSION = /\.pdf$/i;

export function unexpectedPdfs(
  publicFiles: readonly string[],
  allowedPdfs: readonly string[],
): readonly string[] {
  return publicFiles.filter(
    (file) => PDF_EXTENSION.test(file) && !allowedPdfs.includes(file),
  );
}
