import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Link,
} from "@react-pdf/renderer";
import type { PDFDocumentProps } from "@/hooks/usePDFGenerator";

// ─── ATS-safe: Use built-in Helvetica, zero external deps ─────────────────────
Font.register({
  family: "Times-Roman",
  fonts: [],
});

// ─── Styles — NO borders, NO tables, pure text-stream layout ──────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: 10,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 48,
    lineHeight: 1.45,
  },

  // ── Header ──
  headerName: {
    fontSize: 22,
    fontFamily: "Times-Bold",
    color: "#111111",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  headerContacts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    marginBottom: 2,
  },
  headerContact: {
    fontSize: 9,
    color: "#555555",
    marginRight: 14,
    marginBottom: 2,
  },
  headerDivider: {
    marginTop: 12,
    marginBottom: 16,
    height: 1,
    backgroundColor: "#e0e0e0",
  },

  // ── Section ──
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Times-Bold",
    color: "#333333",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  sectionRule: {
    height: 0.75,
    backgroundColor: "#d8d8d8",
    marginBottom: 8,
  },

  // ── Summary ──
  summaryText: {
    fontSize: 10,
    color: "#333333",
    lineHeight: 1.55,
  },

  // ── Experience ──
  expItem: {
    marginBottom: 10,
  },
  expHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 1,
  },
  expRole: {
    fontSize: 10.5,
    fontFamily: "Times-Bold",
    color: "#111111",
  },
  expDates: {
    fontSize: 9,
    color: "#777777",
  },
  expCompany: {
    fontSize: 9.5,
    color: "#444444",
    marginBottom: 4,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 2.5,
    paddingLeft: 2,
  },
  bulletDot: {
    fontSize: 10,
    color: "#555555",
    width: 12,
    flexShrink: 0,
    marginTop: 0.5,
  },
  bulletText: {
    fontSize: 9.5,
    color: "#333333",
    flex: 1,
    lineHeight: 1.5,
  },

  // ── Education ──
  eduItem: {
    marginBottom: 8,
  },
  eduHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 1,
  },
  eduInstitution: {
    fontSize: 10.5,
    fontFamily: "Times-Bold",
    color: "#111111",
  },
  eduDate: {
    fontSize: 9,
    color: "#777777",
  },
  eduDegree: {
    fontSize: 9.5,
    color: "#444444",
  },
  eduMeta: {
    fontSize: 9,
    color: "#666666",
    marginTop: 1,
  },

  // ── Skills ──
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  skillCategory: {
    fontSize: 9.5,
    fontFamily: "Times-Bold",
    color: "#333333",
    marginRight: 6,
    flexShrink: 0,
  },
  skillList: {
    fontSize: 9.5,
    color: "#444444",
    flex: 1,
    lineHeight: 1.5,
  },

  // ── Projects ──
  projectItem: {
    marginBottom: 8,
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 1,
  },
  projectName: {
    fontSize: 10,
    fontFamily: "Times-Bold",
    color: "#111111",
  },
  projectLink: {
    fontSize: 8.5,
    color: "#5a5a8a",
  },
  projectDesc: {
    fontSize: 9.5,
    color: "#333333",
    lineHeight: 1.5,
    marginBottom: 2,
  },
  projectTech: {
    fontSize: 8.5,
    color: "#666666",
  },
});

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View>
      <Text style={S.sectionTitle}>{title}</Text>
      <View style={S.sectionRule} />
    </View>
  );
}

// ─── Main Document ─────────────────────────────────────────────────────────────

export default function ResumeDocument(props: PDFDocumentProps) {
  const {
    contact,
    summary,
    experience,
    education,
    skills,
    projects,
    certifications,
  } = props;

  return (
    <Document
      title={`${contact.name} — Resume`}
      author={contact.name}
      creator="ATS Resume Optimizer"
      producer="ATS Resume Optimizer"
      keywords="resume, ATS"
    >
      <Page size="LETTER" style={S.page}>
        {/* ── Header ────────────────────────────────────── */}
        <Text style={S.headerName}>{contact.name}</Text>
        <View style={S.headerContacts}>
          {contact.email && (
            <Text style={S.headerContact}>{contact.email}</Text>
          )}
          {contact.phone && (
            <Text style={S.headerContact}>{contact.phone}</Text>
          )}
          {contact.location && (
            <Text style={S.headerContact}>{contact.location}</Text>
          )}
          {contact.linkedin && (
            <Link
              src={
                contact.linkedin.startsWith("http")
                  ? contact.linkedin
                  : `https://${contact.linkedin}`
              }
              style={[S.headerContact, { color: "#1a56db", textDecoration: "underline" }]}
            >
              LinkedIn
            </Link>
          )}
          {contact.github && (
            <Link
              src={
                contact.github.startsWith("http")
                  ? contact.github
                  : `https://${contact.github}`
              }
              style={[S.headerContact, { color: "#1a56db", textDecoration: "underline" }]}
            >
              GitHub
            </Link>
          )}
          {contact.portfolio && (
            <Link
              src={
                contact.portfolio.startsWith("http")
                  ? contact.portfolio
                  : `https://${contact.portfolio}`
              }
              style={[S.headerContact, { color: "#1a56db", textDecoration: "underline" }]}
            >
              Portfolio
            </Link>
          )}
        </View>
        <View style={S.headerDivider} />

        {/* ── Summary ───────────────────────────────────── */}
        {summary && (
          <View style={S.section}>
            <SectionHeader title="Professional Summary" />
            <Text style={S.summaryText}>{summary}</Text>
          </View>
        )}

        {/* ── Experience ────────────────────────────────── */}
        {experience.length > 0 && (
          <View style={S.section}>
            <SectionHeader title="Experience" />
            {experience.map((exp, i) => (
              <View key={i} style={S.expItem}>
                <View style={S.expHeader}>
                  <Text style={S.expRole}>{exp.role}</Text>
                  <Text style={S.expDates}>
                    {exp.startDate} – {exp.endDate}
                  </Text>
                </View>
                <Text style={S.expCompany}>
                  {exp.company}
                  {exp.location ? `  ·  ${exp.location}` : ""}
                </Text>
                {exp.bullets.map((b, j) => (
                  <View key={j} style={S.bullet}>
                    <Text style={S.bulletDot}>•</Text>
                    <Text style={S.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* ── Education ─────────────────────────────────── */}
        {education.length > 0 && (
          <View style={S.section}>
            <SectionHeader title="Education" />
            {education.map((edu, i) => (
              <View key={i} style={S.eduItem}>
                <View style={S.eduHeader}>
                  <Text style={S.eduInstitution}>{edu.institution}</Text>
                  <Text style={S.eduDate}>{edu.graduationDate}</Text>
                </View>
                <Text style={S.eduDegree}>
                  {edu.degree} in {edu.field}
                  {edu.honors ? `  ·  ${edu.honors}` : ""}
                </Text>
                {edu.gpa && (
                  <Text style={S.eduMeta}>GPA: {edu.gpa}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Skills ────────────────────────────────────── */}
        {skills.length > 0 && (
          <View style={S.section}>
            <SectionHeader title="Skills" />
            {skills.map((cat, i) => (
              <View key={i} style={S.skillsRow}>
                <Text style={S.skillCategory}>{cat.name}:</Text>
                <Text style={S.skillList}>{cat.skills.join("  ·  ")}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Projects ──────────────────────────────────── */}
        {projects && projects.length > 0 && (
          <View style={S.section}>
            <SectionHeader title="Projects" />
            {projects.map((proj, i) => (
              <View key={i} style={S.projectItem}>
                <View style={S.projectHeader}>
                  <Text style={S.projectName}>{proj.name}</Text>
                  {proj.link && (
                    <Text style={S.projectLink}>{proj.link}</Text>
                  )}
                </View>
                <Text style={S.projectDesc}>{proj.description}</Text>
                <Text style={S.projectTech}>
                  {proj.technologies.join("  ·  ")}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Certifications ────────────────────────────── */}
        {certifications && certifications.length > 0 && (
          <View style={S.section}>
            <SectionHeader title="Certifications" />
            {certifications.map((cert, i) => (
              <View key={i} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#222" }}>
                    {cert.name}
                  </Text>
                  <Text style={{ fontSize: 9, color: "#777" }}>{cert.date}</Text>
                </View>
                <Text style={{ fontSize: 9, color: "#555" }}>{cert.issuer}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
