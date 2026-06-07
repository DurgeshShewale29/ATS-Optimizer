/**
 * lib/wordGenerator.ts
 * Generates a professional ATS-friendly Word (.docx) document from
 * the optimized resume data using the `docx` package.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  ExternalHyperlink,
  UnderlineType,
} from "docx";
import { saveAs } from "file-saver";
import type { PDFDocumentProps } from "@/hooks/usePDFGenerator";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Thin horizontal rule (border paragraph) */
function ruleParagraph(): Paragraph {
  return new Paragraph({
    border: {
      bottom: {
        color: "CCCCCC",
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    spacing: { before: 0, after: 80 },
  });
}

/** Bold uppercase section heading */
function sectionHeading(text: string): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: text.toUpperCase(),
          bold: true,
          size: 20, // 10pt
          color: "333333",
          characterSpacing: 60,
        }),
      ],
      spacing: { before: 200, after: 40 },
    }),
    ruleParagraph(),
  ];
}

/** Bullet point */
function bullet(text: string): Paragraph {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 40 },
    style: "Normal",
  });
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function downloadWordDocument(props: PDFDocumentProps): Promise<void> {
  const { contact, summary, experience, education, skills, projects, certifications } = props;

  const children: Paragraph[] = [];

  // ── Header ──────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: contact.name,
          bold: true,
          size: 40, // 20pt
          color: "111111",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    })
  );

  // Contact line: email · phone · location  then links on next line
  const contactParts: string[] = [];
  if (contact.email) contactParts.push(contact.email);
  if (contact.phone) contactParts.push(contact.phone);
  if (contact.location) contactParts.push(contact.location);

  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactParts.join("   ·   "),
            size: 18,
            color: "555555",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
      })
    );
  }

  // LinkedIn / GitHub / Portfolio as hyperlinks
  const linkRuns: (TextRun | ExternalHyperlink)[] = [];
  const addLink = (label: string, url: string | undefined | null) => {
    if (!url) return;
    const href = url.startsWith("http") ? url : `https://${url}`;
    if (linkRuns.length > 0) {
      linkRuns.push(new TextRun({ text: "   |   ", size: 18, color: "555555" }));
    }
    linkRuns.push(
      new ExternalHyperlink({
        link: href,
        children: [
          new TextRun({
            text: label,
            size: 18,
            color: "1A56DB",
            underline: { type: UnderlineType.SINGLE, color: "1A56DB" },
          }),
        ],
      })
    );
  };

  addLink("LinkedIn", contact.linkedin);
  addLink("GitHub", contact.github);
  addLink("Portfolio", contact.portfolio);

  if (linkRuns.length > 0) {
    children.push(
      new Paragraph({
        children: linkRuns,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      })
    );
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  if (summary) {
    children.push(...sectionHeading("Professional Summary"));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: summary, size: 20, color: "333333" })],
        spacing: { after: 80 },
      })
    );
  }

  // ── Experience ───────────────────────────────────────────────────────────
  if (experience.length > 0) {
    children.push(...sectionHeading("Experience"));

    for (const exp of experience) {
      // Role + Dates on same line (bold left, grey right)
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.role, bold: true, size: 21, color: "111111" }),
            new TextRun({ text: `\t${exp.startDate} – ${exp.endDate}`, size: 18, color: "777777" }),
          ],
          tabStops: [{ type: "right" as const, position: 9360 }],
          spacing: { after: 20 },
        })
      );

      // Company + Location
      const companyLine = [exp.company, exp.location].filter(Boolean).join("  ·  ");
      children.push(
        new Paragraph({
          children: [new TextRun({ text: companyLine, size: 19, color: "444444" })],
          spacing: { after: 60 },
        })
      );

      // Bullets
      for (const b of exp.bullets) {
        children.push(bullet(b));
      }
      children.push(new Paragraph({ text: "", spacing: { after: 40 } }));
    }
  }

  // ── Education ────────────────────────────────────────────────────────────
  if (education.length > 0) {
    children.push(...sectionHeading("Education"));

    for (const edu of education) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: edu.institution, bold: true, size: 21, color: "111111" }),
            new TextRun({ text: `\t${edu.graduationDate}`, size: 18, color: "777777" }),
          ],
          tabStops: [{ type: "right" as const, position: 9360 }],
          spacing: { after: 20 },
        })
      );

      const degreeLine = `${edu.degree} in ${edu.field}${edu.honors ? `  ·  ${edu.honors}` : ""}`;
      children.push(
        new Paragraph({
          children: [new TextRun({ text: degreeLine, size: 19, color: "444444" })],
          spacing: { after: 20 },
        })
      );

      if (edu.gpa) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `GPA: ${edu.gpa}`, size: 18, color: "666666" })],
            spacing: { after: 60 },
          })
        );
      }
    }
  }

  // ── Skills ───────────────────────────────────────────────────────────────
  if (skills.length > 0) {
    children.push(...sectionHeading("Skills"));

    for (const cat of skills) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${cat.name}: `, bold: true, size: 19, color: "333333" }),
            new TextRun({ text: cat.skills.join("  ·  "), size: 19, color: "444444" }),
          ],
          spacing: { after: 60 },
        })
      );
    }
  }

  // ── Projects ─────────────────────────────────────────────────────────────
  if (projects && projects.length > 0) {
    children.push(...sectionHeading("Projects"));

    for (const proj of projects) {
      const projNameRuns: (TextRun | ExternalHyperlink)[] = [
        new TextRun({ text: proj.name, bold: true, size: 20, color: "111111" }),
      ];

      if (proj.link) {
        const href = proj.link.startsWith("http") ? proj.link : `https://${proj.link}`;
        projNameRuns.push(new TextRun({ text: "   " }));
        projNameRuns.push(
          new ExternalHyperlink({
            link: href,
            children: [
              new TextRun({
                text: "↗ View",
                size: 17,
                color: "1A56DB",
                underline: { type: UnderlineType.SINGLE, color: "1A56DB" },
              }),
            ],
          })
        );
      }

      children.push(
        new Paragraph({ children: projNameRuns, spacing: { after: 40 } })
      );

      children.push(
        new Paragraph({
          children: [new TextRun({ text: proj.description, size: 19, color: "333333" })],
          spacing: { after: 40 },
        })
      );

      children.push(
        new Paragraph({
          children: [new TextRun({ text: proj.technologies.join("  ·  "), size: 17, color: "666666" })],
          spacing: { after: 80 },
        })
      );
    }
  }

  // ── Certifications ───────────────────────────────────────────────────────
  if (certifications && certifications.length > 0) {
    children.push(...sectionHeading("Certifications"));

    for (const cert of certifications) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: cert.name, bold: true, size: 19, color: "222222" }),
            new TextRun({ text: `\t${cert.date}`, size: 18, color: "777777" }),
          ],
          tabStops: [{ type: "right" as const, position: 9360 }],
          spacing: { after: 20 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: cert.issuer, size: 18, color: "555555" })],
          spacing: { after: 60 },
        })
      );
    }
  }

  // ── Build document ───────────────────────────────────────────────────────
  const doc = new Document({
    creator: "ATS Resume Optimizer",
    title: `${contact.name} — Resume`,
    description: "ATS-optimized resume generated by ATS Resume Optimizer",
    sections: [
      {
        properties: {},
        children,
      },
    ],
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 20,
            color: "1A1A1A",
          },
          paragraph: {
            spacing: { line: 276 },
          },
        },
      },
    },
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${contact.name.replace(/\s+/g, "_")}_Resume.docx`;
  saveAs(blob, filename);
}
