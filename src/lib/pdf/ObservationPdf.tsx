import { Document, Font, Image, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import {
  FORM_TITLE,
  HEADER_LABELS,
  IMPROVEMENTS_HEADING,
  JUDGEMENT_TABLE,
  PERCENTAGE_KEY,
  PERCENTAGE_KEY_INTRO,
  RATING_LEVELS,
  RUBRIC_COLUMN_HEADINGS,
  SCHOOL_NAME,
  SIGNATURE_LINES,
  STRENGTHS_HEADING,
} from "@/db/seed-data/rubric";
import { levelLabel, type LessonJudgement } from "../judgement";
import type { ObservationState, RubricArea, VisitSummary } from "../queries";

// Never split words: the rubric wording must read exactly as on the school's form.
Font.registerHyphenationCallback((word) => [word]);

const NAVY = "#0A3655";
const WASH = "#E6EEF4";
const RULE = "#8C96A8";
const INK = "#121A22";
const SOFT = "#4B5866";

const s = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 34, paddingHorizontal: 28, fontFamily: "Helvetica", fontSize: 8, color: INK },
  masthead: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  crest: { width: 34, height: 31, marginRight: 10 },
  school: { fontFamily: "Helvetica-Bold", fontSize: 12, color: NAVY },
  formTitle: { fontSize: 10, color: INK, marginTop: 2 },
  demo: {
    marginLeft: "auto",
    borderWidth: 1,
    borderColor: NAVY,
    color: NAVY,
    paddingVertical: 3,
    paddingHorizontal: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  grid: { borderTopWidth: 0.75, borderLeftWidth: 0.75, borderColor: RULE },
  row: { flexDirection: "row" },
  cell: { borderRightWidth: 0.75, borderBottomWidth: 0.75, borderColor: RULE, padding: 4 },
  label: { fontFamily: "Helvetica-Bold", fontSize: 7.5 },
  value: { marginTop: 2, fontSize: 9 },
  band: { backgroundColor: NAVY, color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 9, padding: 4, marginTop: 10 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7.5, textAlign: "center", backgroundColor: WASH },
  descriptor: { fontSize: 6.6, lineHeight: 1.25 },
  chosen: { backgroundColor: WASH },
  chosenText: { fontSize: 6.6, lineHeight: 1.25, fontFamily: "Helvetica-Bold" },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 10, color: NAVY, marginTop: 12, marginBottom: 4 },
  small: { fontSize: 7, color: SOFT },
  stamp: { marginTop: 3, borderWidth: 1, borderColor: NAVY, color: NAVY, padding: 3, fontSize: 7, alignSelf: "flex-start" },
  footer: { position: "absolute", bottom: 14, left: 28, right: 28, flexDirection: "row", fontSize: 6.5, color: SOFT },
  letter: { fontSize: 11, lineHeight: 1.55 },
});

const W = { area: "13%", level: "12%", comments: "15%" } as const;

function Tick() {
  return (
    <Svg width={8} height={8} viewBox="0 0 12 12">
      <Path d="M1.8 6.6 4.8 9.4 10.4 2.8" stroke={NAVY} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function stampText(name: string | null, at: string | null): string | null {
  if (!name || !at) return null;
  const when = new Date(at).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dubai",
  });
  return `Signed electronically by ${name} on ${when} (UAE time)`;
}

export interface ObservationPdfProps {
  visit: VisitSummary;
  state: ObservationState;
  rubric: RubricArea[];
  judgement: LessonJudgement;
  crestPath: string;
  dateLabel: string;
}

export function ObservationPdf({ visit, state, rubric, judgement, crestPath, dateLabel }: ObservationPdfProps) {
  const h = state.header;
  const demo = visit.cycleIsDemo;
  const lines = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);
  const masthead = (
    <View style={s.masthead} fixed>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={crestPath} style={s.crest} />
      <View>
        <Text style={s.school}>{SCHOOL_NAME}</Text>
        <Text style={s.formTitle}>{FORM_TITLE}</Text>
      </View>
      {demo ? <Text style={s.demo}>DEMO: SAMPLE RATINGS, NOT A REAL JUDGEMENT</Text> : null}
    </View>
  );
  const footer = (
    <View style={s.footer} fixed>
      <Text>
        {visit.teacherName} · {visit.className} · {h.subject || visit.subject} · {dateLabel}
      </Text>
      <Text style={{ marginLeft: "auto" }} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
  const headerCells: [string, string][][] = [
    [
      [HEADER_LABELS.teacher, visit.teacherName],
      [HEADER_LABELS.time, h.time],
      [HEADER_LABELS.observer, visit.observerName],
    ],
    [
      [HEADER_LABELS.date, dateLabel],
      [HEADER_LABELS.length, h.lengthOfObservation],
      [HEADER_LABELS.title, h.title],
    ],
    [
      [HEADER_LABELS.subject, h.subject],
      [HEADER_LABELS.topic, h.topic],
      [HEADER_LABELS.roll, h.numberOnRoll || h.numberPresent ? `${h.numberOnRoll} / ${h.numberPresent}` : ""],
    ],
  ];

  return (
    <Document title={`${FORM_TITLE}: ${visit.teacherName}`} author={SCHOOL_NAME} creator={SCHOOL_NAME} producer={SCHOOL_NAME}>
      <Page size="A4" orientation="landscape" style={s.page}>
        {masthead}
        <View style={s.grid}>
          {headerCells.map((row, i) => (
            <View key={i} style={s.row}>
              {row.map(([label, value]) => (
                <View key={label} style={[s.cell, { width: "33.333%" }]}>
                  <Text style={s.label}>{label}</Text>
                  <Text style={s.value}>{value || " "}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {rubric.map((area) => {
          const header = (
            <View style={s.row}>
              <View style={[s.cell, s.th, { width: W.area }]}>
                <Text>{RUBRIC_COLUMN_HEADINGS.area}</Text>
              </View>
              {RATING_LEVELS.map((l) => (
                <View key={l.level} style={[s.cell, s.th, { width: W.level }]}>
                  <Text>{l.label}</Text>
                </View>
              ))}
              <View style={[s.cell, s.th, { width: W.comments }]}>
                <Text>{RUBRIC_COLUMN_HEADINGS.comments}</Text>
              </View>
            </View>
          );
          const criterionRow = (c: RubricArea["criteria"][number]) => {
            const r = state.ratings[c.id];
            return (
              <View key={c.id} style={s.row} wrap={false}>
                <View style={[s.cell, { width: W.area }]}>
                  <Text style={s.label}>{c.name}</Text>
                </View>
                {RATING_LEVELS.map((l) => {
                  const chosen = r?.level === l.level;
                  return (
                    <View key={l.level} style={[s.cell, { width: W.level }, chosen ? s.chosen : {}]}>
                      {chosen ? <Tick /> : null}
                      <Text style={chosen ? s.chosenText : s.descriptor}>{c.descriptors[l.level]}</Text>
                    </View>
                  );
                })}
                <View style={[s.cell, { width: W.comments }]}>
                  <Text style={s.descriptor}>{r?.comment ?? ""}</Text>
                </View>
              </View>
            );
          };
          const [first, ...rest] = area.criteria;
          return (
            <View key={area.id}>
              {/* The area heading always starts a page section together with its column headings and first criterion. */}
              <View wrap={false}>
                <Text style={s.band}>{area.name}</Text>
                <View style={s.grid}>
                  {header}
                  {first ? criterionRow(first) : null}
                </View>
              </View>
              {rest.length > 0 ? <View style={[s.grid, { borderTopWidth: 0 }]}>{rest.map(criterionRow)}</View> : null}
            </View>
          );
        })}

        <View wrap={false}>
          <Text style={s.h2}>{PERCENTAGE_KEY_INTRO}</Text>
          <View style={s.grid}>
            <View style={s.row}>
              {PERCENTAGE_KEY.map((k) => (
                <View key={k.term} style={[s.cell, s.th, { width: `${100 / PERCENTAGE_KEY.length}%` }]}>
                  <Text>{k.term}</Text>
                </View>
              ))}
            </View>
            <View style={s.row}>
              {PERCENTAGE_KEY.map((k) => (
                <View key={k.term} style={[s.cell, { width: `${100 / PERCENTAGE_KEY.length}%` }]}>
                  <Text style={{ textAlign: "center" }}>{k.range}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View wrap={false}>
          <Text style={s.h2}>{JUDGEMENT_TABLE.title}</Text>
          <View style={[s.grid, { width: "60%" }]}>
            <View style={s.row}>
              <View style={[s.cell, s.th, { width: "65%", textAlign: "left" }]}>
                <Text>{JUDGEMENT_TABLE.elementsHeading}</Text>
              </View>
              <View style={[s.cell, s.th, { width: "35%" }]}>
                <Text>{JUDGEMENT_TABLE.ratingHeading}</Text>
              </View>
            </View>
            {rubric.map((a, i) => {
              const lvl = judgement.areas[i]?.effective ?? null;
              return (
                <View key={a.id} style={s.row}>
                  <View style={[s.cell, { width: "65%" }]}>
                    <Text>{a.judgementLabel}</Text>
                  </View>
                  <View style={[s.cell, { width: "35%" }]}>
                    <Text>{lvl ? levelLabel(lvl) : ""}</Text>
                  </View>
                </View>
              );
            })}
            <View style={s.row}>
              <View style={[s.cell, { width: "65%" }, s.chosen]}>
                <Text style={s.label}>{JUDGEMENT_TABLE.overallLabel}</Text>
              </View>
              <View style={[s.cell, { width: "35%" }, s.chosen]}>
                <Text style={s.label}>{judgement.overallEffective ? levelLabel(judgement.overallEffective) : ""}</Text>
              </View>
            </View>
          </View>
        </View>

        <View wrap={false} style={[s.grid, { marginTop: 12 }]}>
          <View style={s.row}>
            <View style={[s.cell, s.th, { width: "50%" }]}>
              <Text>{STRENGTHS_HEADING}</Text>
            </View>
            <View style={[s.cell, s.th, { width: "50%" }]}>
              <Text>{IMPROVEMENTS_HEADING}</Text>
            </View>
          </View>
          <View style={s.row}>
            <View style={[s.cell, { width: "50%", minHeight: 70 }]}>
              {lines(state.strengths).map((l, i) => (
                <Text key={i} style={{ fontSize: 8.5, marginBottom: 3 }}>
                  {"•"} {l}
                </Text>
              ))}
            </View>
            <View style={[s.cell, { width: "50%", minHeight: 70 }]}>
              {lines(state.improvements).map((l, i) => (
                <Text key={i} style={{ fontSize: 8.5, marginBottom: 3 }}>
                  {"•"} {l}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <View wrap={false} style={{ marginTop: 18, flexDirection: "row", gap: 24 }}>
          <View style={{ width: "40%" }}>
            <Text>{SIGNATURE_LINES.teacher} ……………………………………………….</Text>
            {stampText(state.signedByTeacherName, state.signedByTeacherAt) ? (
              <Text style={s.stamp}>{stampText(state.signedByTeacherName, state.signedByTeacherAt)}</Text>
            ) : null}
          </View>
          <View style={{ width: "60%" }}>
            <Text>{SIGNATURE_LINES.coordinator} ……………………………………………</Text>
            {stampText(state.signedByCoordinatorName, state.signedByCoordinatorAt) ? (
              <Text style={s.stamp}>{stampText(state.signedByCoordinatorName, state.signedByCoordinatorAt)}</Text>
            ) : null}
          </View>
        </View>
        {footer}
      </Page>

      {state.feedback.trim() ? (
        <Page size="A4" orientation="landscape" style={s.page}>
          {masthead}
          <Text style={s.h2}>Feedback to the teacher</Text>
          <View style={{ width: "70%" }}>
            {state.feedback.split(/\n{2,}/).map((p, i) => (
              <Text key={i} style={[s.letter, { marginBottom: 8 }]}>
                {p.trim()}
              </Text>
            ))}
          </View>
          {footer}
        </Page>
      ) : null}
    </Document>
  );
}
