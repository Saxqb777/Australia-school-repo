// Transcribed verbatim from the school's official Teacher Observation Form (docx).
// Do not edit wording here without the school's approval: the app and PDF must match the form exactly.
// Line breaks from the form's table cells are joined with single spaces; words broken at a hyphen
// across lines (for example "problem-" / "solving") are rejoined without a space.

export const SCHOOL_NAME = "Australian School of Abu Dhabi";
export const FORM_TITLE = "Teacher Observation Form";

/** Rating levels in the form's column order. Level number 1 = Outstanding, 6 = Very Weak. */
export const RATING_LEVELS = [
  { level: 1, label: "Outstanding", short: "O" },
  { level: 2, label: "Very Good", short: "VG" },
  { level: 3, label: "Good", short: "G" },
  { level: 4, label: "Acceptable", short: "A" },
  { level: 5, label: "Weak", short: "W" },
  { level: 6, label: "Very Weak", short: "VW" },
] as const;

export type RatingLevel = (typeof RATING_LEVELS)[number]["level"];

/** Header fields as labelled on the form, in reading order (row by row, left to right). */
export const HEADER_LABELS = {
  teacher: "Teacher Observed:",
  time: "Time:",
  observer: "Observer:",
  date: "Date of Observation:",
  length: "Length of Observation:",
  title: "Title:",
  subject: "Subject (Math/English/Arabic/etc..)",
  topic: "Topic:",
  roll: "Number on roll/present:",
} as const;

export const RUBRIC_COLUMN_HEADINGS = {
  area: "Observation Area",
  comments: "Comments",
} as const;

export const PERCENTAGE_KEY_INTRO =
  "The following terms are used throughout the performance indicators with the following definitions:";

/** Percentage key exactly as on the form. min/max are inclusive whole percentages used by the helper. */
export const PERCENTAGE_KEY = [
  { term: "Almost all", range: "Greater than 90%", min: 91, max: 100 },
  { term: "Most", range: "75% - 90%", min: 75, max: 90 },
  { term: "Large majority", range: "61% - 74%", min: 61, max: 74 },
  { term: "Majority", range: "50% - 60%", min: 50, max: 60 },
  { term: "Large minority", range: "31% - 49%", min: 31, max: 49 },
  { term: "Minority", range: "16% - 30%", min: 16, max: 30 },
  { term: "Few", range: "Up to 15%", min: 0, max: 15 },
] as const;

export const JUDGEMENT_TABLE = {
  title: "Criteria for overall lesson judgement:",
  elementsHeading: "Elements of Evaluation",
  ratingHeading: "Overall Rating",
  overallLabel: "Overall Lesson Judgement",
} as const;

export const STRENGTHS_HEADING = "Areas of Strength";
export const IMPROVEMENTS_HEADING = "Suggested Areas for Improvement";

export const SIGNATURE_LINES = {
  teacher: "Signature of Teacher:",
  coordinator: "Signature of MYP Coordinator/MYP Coordinator Assistant/Head of Department:",
} as const;

export interface RubricCriterionSeed {
  code: string;
  name: string;
  /** Descriptors keyed by level number, 1 = Outstanding ... 6 = Very Weak. */
  descriptors: Record<RatingLevel, string>;
}

export interface RubricAreaSeed {
  position: number;
  name: string;
  /** Wording used for this area in the form's overall lesson judgement table. */
  judgementLabel: string;
  criteria: RubricCriterionSeed[];
}

export const RUBRIC: RubricAreaSeed[] = [
  {
    position: 1,
    name: "Teaching for Effective Learning",
    judgementLabel: "Teaching for effective learning",
    criteria: [
      {
        code: "1.1",
        name: "Teacher’s subject knowledge and understanding of how students learn",
        descriptors: {
          1: "Teacher expertly integrates IB concepts and demonstrates deep understanding of how students learn, fostering inquiry and conceptual understanding.",
          2: "Teacher applies strong subject knowledge and effective strategies that promote inquiry and student learning.",
          3: "Teacher demonstrates solid subject knowledge and uses appropriate strategies to support learning, with some inquiry.",
          4: "Teacher shows adequate subject knowledge but struggles to fully support student inquiry and understanding.",
          5: "Teacher has weak subject knowledge and struggles to promote student learning or inquiry.",
          6: "Teacher lacks the subject knowledge and strategies necessary to support student learning.",
        },
      },
      {
        code: "1.2",
        name: "Planning, learning environment, and use of time and resources",
        descriptors: {
          1: "Lessons are meticulously planned with high-quality resources, an engaging learning environment, and excellent use of time, fostering inquiry and engagement.",
          2: "Lessons are well-planned, with good use of resources and time, promoting a positive learning environment and student engagement.",
          3: "Lessons are adequately planned, with resources and time used to support learning and some inquiry.",
          4: "Lessons are planned with minimal resources, and time is not always used effectively to support learning.",
          5: "Lessons are poorly planned, with limited use of resources, time, or a positive learning environment.",
          6: "Lessons lack planning, appropriate resources, or effective use of time, with minimal learning engagement.",
        },
      },
      {
        code: "1.3",
        name: "Teacher-student interactions, questioning, and dialogue",
        descriptors: {
          1: "Teacher consistently engages students in meaningful dialogue, using questioning techniques that promote critical thinking, reflection, and problem-solving.",
          2: "Teacher regularly interacts with students using effective questioning and dialogue to develop understanding and higher-order thinking.",
          3: "Teacher interacts with students appropriately, using questioning to check for understanding and promote learning.",
          4: "Teacher interactions and questioning are limited, focusing mainly on recall or lower-order thinking skills.",
          5: "Teacher rarely interacts with students effectively, and questioning does not promote deeper understanding.",
          6: "Teacher does not engage students in meaningful dialogue or questioning to support learning.",
        },
      },
      {
        code: "1.4",
        name: "Teaching strategies to meet individual and group needs",
        descriptors: {
          1: "Teacher expertly adapts teaching strategies to meet the needs of individuals and groups, ensuring all students, including SEN, G&T, and EAL learners, are challenged and supported.",
          2: "Teacher regularly adapts teaching strategies to support diverse learners, promoting engagement and progress.",
          3: "Teacher uses a variety of strategies to support student learning, though differentiation may be inconsistent.",
          4: "Teacher occasionally adapts strategies, but many students do not receive the support they need to progress.",
          5: "Teaching strategies are minimal, with limited differentiation or support for individual needs.",
          6: "Teaching strategies are not adapted, and individual and group needs are not met.",
        },
      },
      {
        code: "1.5",
        name: "Developing critical thinking, problem-solving, and independent learning",
        descriptors: {
          1: "Teacher expertly promotes critical thinking, problem-solving, and independent learning, integrating IB Learner Profile attributes and ATL skills into all aspects of learning.",
          2: "Teacher regularly encourages critical thinking, problem-solving, and independent learning, using inquiry-based tasks.",
          3: "Teacher promotes some critical thinking and independent learning, though students often rely on teacher guidance.",
          4: "Teacher occasionally encourages critical thinking, but students rely heavily on teacher direction.",
          5: "Critical thinking and independent learning are rarely promoted, and students do not engage in problem-solving activities.",
          6: "Critical thinking, problem-solving, and independent learning are absent from lessons.",
        },
      },
    ],
  },
  {
    position: 2,
    name: "Learning Skills",
    judgementLabel: "Learning Skills",
    criteria: [
      {
        code: "2.1",
        name: "Student responsibility and ownership of learning",
        descriptors: {
          1: "Students take full ownership of their learning, reflecting regularly and setting goals aligned with IB Learner Profile attributes.",
          2: "Students take responsibility for their learning, regularly reflecting on strengths, weaknesses, and goals.",
          3: "Students engage in learning and reflect with teacher guidance but require support for goal-setting.",
          4: "Students engage minimally in reflection and rely on teacher direction.",
          5: "Students show limited responsibility for learning and rarely reflect or set goals.",
          6: "Students do not take responsibility for their learning and do not reflect or set goals.",
        },
      },
      {
        code: "2.2",
        name: "Student collaboration, communication, and inquiry skills",
        descriptors: {
          1: "Students collaborate effectively, engage in rich dialogue, and lead inquiry-based activities, demonstrating ATL skills (communication, social skills).",
          2: "Students communicate and collaborate well, contributing actively to inquiry-based tasks and demonstrating ATL skills.",
          3: "Students collaborate and communicate effectively with some guidance from the teacher, engaging in inquiry.",
          4: "Students collaborate with teacher direction, but inquiry and communication skills are underdeveloped.",
          5: "Students struggle to collaborate, communicate, or engage in inquiry, needing constant support.",
          6: "Students do not collaborate or engage in inquiry, and communication is ineffective.",
        },
      },
      {
        code: "2.3",
        name: "Application of learning across disciplines and to real-world contexts",
        descriptors: {
          1: "Students consistently apply learning across disciplines and make deep connections to real-world contexts, demonstrating critical thinking and ATL skills.",
          2: "Students regularly apply learning to real-world situations and make connections between subjects, with support from the teacher.",
          3: "Students make some connections between subjects and apply learning to familiar contexts with teacher guidance.",
          4: "Students occasionally apply learning to real-world contexts but rely heavily on teacher input.",
          5: "Students struggle to make connections between subjects or apply learning to real-world contexts.",
          6: "Students do not make connections or apply learning beyond the classroom.",
        },
      },
      {
        code: "2.4",
        name: "Innovation, creativity, independent learning, and the use of technology",
        descriptors: {
          1: "Students consistently engage in creative problem-solving, take risks, and show independence in their learning, effectively using technology to explore ideas.",
          2: "Students regularly engage in creative thinking and independent learning, using technology to enhance their learning.",
          3: "Students engage in creative thinking and use technology with teacher guidance but show limited independence.",
          4: "Students show minimal creativity or independence and rely heavily on the teacher for direction.",
          5: "Students rarely engage in creative thinking, independent learning, or technology use.",
          6: "Students do not engage in creative thinking, independent learning, or use technology effectively.",
        },
      },
    ],
  },
  {
    position: 3,
    name: "Assessment",
    judgementLabel: "Assessment",
    criteria: [
      {
        code: "3.1",
        name: "Use of assessment information to influence teaching and curriculum",
        descriptors: {
          1: "Assessment data is expertly used to inform teaching strategies and curriculum adjustments, ensuring all students meet learning objectives.",
          2: "Assessment data is regularly used to adjust teaching and ensure alignment with learning goals.",
          3: "Assessment data is used to inform some instructional adjustments, though not consistently.",
          4: "Assessment data is occasionally used to influence teaching but is not applied consistently.",
          5: "Assessment data is minimally used to inform teaching, leading to gaps in student progress.",
          6: "Assessment data is not used to influence teaching or curriculum planning.",
        },
      },
      {
        code: "3.2",
        name: "Teachers’ knowledge of, and support for, students’ learning",
        descriptors: {
          1: "Teacher demonstrates excellent knowledge of each student’s learning needs, providing personalized support to ensure progress and development.",
          2: "Teacher regularly identifies student learning needs and provides appropriate support to enhance progress.",
          3: "Teacher adequately understands student learning needs but may not provide consistent support for all learners.",
          4: "Teacher shows some knowledge of student learning needs but does not consistently provide support.",
          5: "Teacher has limited knowledge of student learning needs and offers minimal support.",
          6: "Teacher does not demonstrate knowledge of student learning needs or provide support.",
        },
      },
    ],
  },
  {
    position: 4,
    name: "Attainment",
    judgementLabel: "Attainment",
    criteria: [
      {
        code: "4.1",
        name: "Knowledge, skills and understanding, especially in the key subjects",
        descriptors: {
          1: "In lessons and in their recent work, most students demonstrate levels of knowledge, skills and understanding that are above curriculum standards.",
          2: "In lessons and in their recent work, a large majority of students demonstrate levels of knowledge, skills and understanding that are above curriculum standards.",
          3: "In lessons and in their recent work, the majority of students demonstrate levels of knowledge, skills and understanding that are above curriculum standards.",
          4: "In lessons and in their recent work, most students demonstrate levels of knowledge, skills and understanding that are in line with curriculum standards.",
          5: "In lessons and in their recent work, less than three-quarters of students demonstrate levels of knowledge, skills and understanding that are at least in line with curriculum standards.",
          6: "In lessons and in their recent work, only a few students demonstrate levels of knowledge, skills and understanding that are in line with curriculum standards. There are significant gaps in students’ knowledge and weaknesses in their skills and understanding.",
        },
      },
    ],
  },
  {
    position: 5,
    name: "Progress",
    judgementLabel: "Progress",
    criteria: [
      {
        code: "5.1",
        name: "Progress in lessons",
        descriptors: {
          1: "In lessons, most students make better than expected progress in relation to appropriate learning objectives aligned with the expected curriculum standards.",
          2: "In lessons, a large majority of students make better than expected progress in relation to appropriate learning objectives aligned with the expected curriculum standards.",
          3: "In lessons, the majority of students make better than expected progress in relation to appropriate learning objectives aligned with the expected curriculum standards.",
          4: "In lessons, most students make expected progress in relation to appropriate learning objectives aligned with the expected curriculum standards and a few make better progress.",
          5: "In lessons, only a majority of students make expected progress in relation to appropriate learning objectives aligned with the expected curriculum standards.",
          6: "In lessons, only a few students make expected progress in relation to appropriate learning objectives aligned with the expected curriculum standards.",
        },
      },
    ],
  },
  {
    position: 6,
    name: "Inclusion and Differentiation",
    judgementLabel: "Inclusion and Differentiation",
    criteria: [
      {
        code: "6.1",
        name: "Differentiation of instruction and resources for diverse learners",
        descriptors: {
          1: "Instruction and resources are expertly differentiated to support diverse learners, incorporating IB Learner Profile attributes and ATL skills to ensure progress for SEN, G&T, and EAL students.",
          2: "Differentiation effectively supports diverse learners, with resources and instruction aligned with IB and UAE standards.",
          3: "Differentiation supports most learners, with resources addressing some diverse learning needs.",
          4: "Differentiation is inconsistent, and many students do not receive the support they need to make progress.",
          5: "Differentiation is minimal, with limited resources or support for diverse learners.",
          6: "Differentiation is absent, and diverse learners' needs are not met.",
        },
      },
      {
        code: "6.2",
        name: "Classroom strategies to support SEN, G&T, and EAL students",
        descriptors: {
          1: "Teacher uses a wide range of strategies, including scaffolding and peer support, to ensure all students, especially SEN, G&T, and EAL, are engaged and progressing, demonstrating ATL skills.",
          2: "Teacher regularly uses strategies to support SEN, G&T, and EAL learners, promoting engagement and progress.",
          3: "Teacher applies some strategies to support diverse learners, though they may not be consistently applied.",
          4: "Teacher occasionally uses strategies to support diverse learners, with limited impact on engagement.",
          5: "Classroom strategies to support SEN, G&T, and EAL students are minimal, with limited engagement or progress.",
          6: "No strategies are used to support diverse learners, and they struggle to make progress.",
        },
      },
      {
        code: "6.3",
        name: "Progress monitoring and tracking of diverse learners",
        descriptors: {
          1: "Teacher consistently tracks the progress of diverse learners using differentiated assessments, ensuring progress for SEN, G&T, and EAL students.",
          2: "Teacher regularly monitors the progress of diverse learners, using assessments to ensure they meet learning goals.",
          3: "Teacher tracks progress adequately but does not consistently differentiate assessments for all learners.",
          4: "Teacher monitors progress sporadically, leading to gaps in support for diverse learners.",
          5: "Progress tracking is minimal, and many diverse learners fall behind.",
          6: "Progress tracking is absent, and diverse learners' progress is not monitored.",
        },
      },
    ],
  },
  {
    position: 7,
    name: "Innovation and Creativity",
    judgementLabel: "Innovation and Creativity",
    criteria: [
      {
        code: "7.1",
        name: "Classroom promotes innovation, creativity, and risk-taking",
        descriptors: {
          1: "The classroom environment strongly encourages creativity, innovation, and risk-taking through problem-solving and technology use.",
          2: "Creative problem-solving and innovation are regularly promoted through the use of technology and inquiry-based learning.",
          3: "Creativity and problem-solving are encouraged, with basic integration of technology.",
          4: "The classroom environment allows some creativity, but technology and innovation are minimally integrated.",
          5: "The classroom lacks creativity and risk-taking, with minimal use of technology.",
          6: "The classroom environment does not promote creativity, innovation, or risk-taking.",
        },
      },
      {
        code: "7.2",
        name: "Students are encouraged to think creatively and take risks",
        descriptors: {
          1: "Students consistently take risks, think creatively, and explore innovative solutions, leading to deep learning.",
          2: "Students regularly think creatively and take risks in their learning, encouraged by the teacher.",
          3: "Students are occasionally encouraged to think creatively and take risks, with teacher guidance.",
          4: "Students show limited creativity and risk-taking, relying on teacher direction.",
          5: "Students rarely engage in creative thinking or risk-taking.",
          6: "Students are not encouraged to think creatively or take risks in their learning.",
        },
      },
    ],
  },
  {
    position: 8,
    name: "Leadership and Management",
    judgementLabel: "Leadership and Management",
    criteria: [
      {
        code: "8.1",
        name: "Teacher demonstrates leadership and facilitates student agency and collaboration",
        descriptors: {
          1: "Teacher demonstrates strong leadership, empowering students and facilitating collaboration in inquiry-based projects and group work.",
          2: "Teacher regularly demonstrates leadership, promoting collaboration and student agency in the classroom.",
          3: "Teacher demonstrates leadership, occasionally supporting student collaboration and agency.",
          4: "Teacher provides limited opportunities for student leadership and collaboration.",
          5: "Teacher’s leadership is weak, with minimal collaboration opportunities.",
          6: "Teacher does not demonstrate leadership or support student collaboration.",
        },
      },
      {
        code: "8.2",
        name: "Teacher self-evaluates and engages in continuous improvement",
        descriptors: {
          1: "Teacher consistently reflects on their teaching practice and actively seeks feedback for continuous improvement.",
          2: "Teacher regularly engages in self-evaluation and uses feedback to improve their practice.",
          3: "Teacher reflects occasionally on their practice and makes some improvements based on feedback.",
          4: "Teacher shows limited self-reflection and does not actively seek feedback.",
          5: "Teacher rarely reflects on their practice and shows little effort to improve.",
          6: "Teacher does not reflect on their teaching or engage in any improvement efforts.",
        },
      },
    ],
  },
];
