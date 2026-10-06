/**
 * Amerivo English placement-test question bank.
 * GRAMMAR: 8 items per CEFR level. READING / LISTENING: 2 per level, 3 questions each.
 * Answers never leave the API.
 */
import type { CanDo, GrammarItem, ListeningClip, ReadingPassage } from "./types";

export const GRAMMAR: GrammarItem[] = [
  // ───────────────────────────── A1 ─────────────────────────────
  {
    id: "g-a1-01",
    level: "A1",
    prompt: "My sister ___ a doctor.",
    options: ["am", "is", "are", "be"],
    answer: 1,
    explanation: 'With he, she, it, or one person (my sister), we use "is".',
  },
  {
    id: "g-a1-02",
    level: "A1",
    prompt: "There ___ two cats in the yard.",
    options: ["is", "be", "are", "am"],
    answer: 2,
    explanation: '"Two cats" is plural, so we say "there are". We use "there is" for one thing.',
  },
  {
    id: "g-a1-03",
    level: "A1",
    prompt: "I ___ to school every day.",
    options: ["walk", "walks", "walking", "to walk"],
    answer: 0,
    explanation: 'With "I" in the present simple, the verb has no -s: "I walk".',
  },
  {
    id: "g-a1-04",
    level: "A1",
    prompt: "Ana ___ spicy food.",
    options: ["not like", "don't like", "isn't like", "doesn't like"],
    answer: 3,
    explanation: 'With he, she, or one person (Ana), the negative is "doesn\'t" + verb: "doesn\'t like".',
  },
  {
    id: "g-a1-05",
    level: "A1",
    prompt: "I have ___ orange in my bag.",
    options: ["a", "an", "two", "many"],
    answer: 1,
    explanation: '"Orange" starts with a vowel sound, so we use "an". "Two" and "many" need a plural (oranges).',
  },
  {
    id: "g-a1-06",
    level: "A1",
    prompt: "Mr. Lee has two ___, a boy and a girl.",
    options: ["child", "childs", "children", "childrens"],
    answer: 2,
    explanation: 'The plural of "child" is irregular: "children". We do not add -s.',
  },
  {
    id: "g-a1-07",
    level: "A1",
    prompt: "It's very cold today. Wear your ___.",
    options: ["jacket", "shorts", "sandals", "sunglasses"],
    answer: 0,
    explanation: "A jacket keeps you warm when it is cold. Shorts and sandals are for hot weather.",
  },
  {
    id: "g-a1-08",
    level: "A1",
    prompt: "My mother's brother is my ___.",
    options: ["cousin", "aunt", "grandfather", "uncle"],
    answer: 3,
    explanation: "Your mother's or father's brother is your uncle. An aunt is a woman.",
  },

  // ───────────────────────────── A2 ─────────────────────────────
  {
    id: "g-a2-01",
    level: "A2",
    prompt: "We ___ to the beach last weekend.",
    options: ["go", "goes", "went", "gone"],
    answer: 2,
    explanation: '"Last weekend" is finished time, so we use the past simple. The past of "go" is "went".',
  },
  {
    id: "g-a2-02",
    level: "A2",
    prompt: "A: ___ you see the game yesterday?\nB: Yes, it was great!",
    options: ["Do", "Did", "Were", "Have"],
    answer: 1,
    explanation: 'Past simple questions use "Did" + base verb: "Did you see…?"',
  },
  {
    id: "g-a2-03",
    level: "A2",
    prompt: "Look at those dark clouds! It ___ rain.",
    options: ["is going to", "goes to", "going to", "is go to"],
    answer: 0,
    explanation: 'We use "be going to" for a prediction based on what we can see now. We need "is" before "going to".',
  },
  {
    id: "g-a2-04",
    level: "A2",
    prompt: "My brother is ___ than me.",
    options: ["tall", "more tall", "tallest", "taller"],
    answer: 3,
    explanation: 'Short adjectives add -er to compare two things: "taller than". We don\'t say "more tall".',
  },
  {
    id: "g-a2-05",
    level: "A2",
    prompt: "How ___ water do you drink every day?",
    options: ["many", "lot", "few", "much"],
    answer: 3,
    explanation: '"Water" is uncountable, so we ask "How much". "How many" is for things we can count.',
  },
  {
    id: "g-a2-06",
    level: "A2",
    prompt: "Sara ___ late for class. She always arrives early.",
    options: ["is never", "never is", "never", "is not never"],
    answer: 0,
    explanation: 'Adverbs of frequency go after the verb "be": "is never". We don\'t use two negatives.',
  },
  {
    id: "g-a2-07",
    level: "A2",
    prompt: "I need to ___ my homework before dinner.",
    options: ["make", "take", "do", "have"],
    answer: 2,
    explanation: 'In English we "do" homework. "Make homework" is a common mistake.',
  },
  {
    id: "g-a2-08",
    level: "A2",
    prompt: "The museum is free, so you don't need to ___ for tickets.",
    options: ["spend", "pay", "buy", "cost"],
    answer: 1,
    explanation: 'We say "pay for" something. We "buy tickets" (no "for"), and "spend" needs an amount of money.',
  },

  // ───────────────────────────── B1 ─────────────────────────────
  {
    id: "g-b1-01",
    level: "B1",
    prompt: "We ___ in this apartment since 2019.",
    options: ["live", "lived", "have lived", "are living"],
    answer: 2,
    explanation: 'With "since" + a starting point, we use the present perfect for something that continues until now.',
  },
  {
    id: "g-b1-02",
    level: "B1",
    prompt: "If it ___ tomorrow, we'll stay home and play board games.",
    options: ["rains", "will rain", "rained", "would rain"],
    answer: 0,
    explanation: 'In the first conditional, the "if" part uses the present simple, not "will".',
  },
  {
    id: "g-b1-03",
    level: "B1",
    prompt: "If I ___ more free time, I would learn to play the guitar.",
    options: ["have", "had", "will have", "would have"],
    answer: 1,
    explanation: 'For an imaginary situation (second conditional), we use the past simple after "if" and "would" in the other part.',
  },
  {
    id: "g-b1-04",
    level: "B1",
    prompt: "This bridge ___ in 1937.",
    options: ["is building", "built", "has built", "was built"],
    answer: 3,
    explanation: 'The bridge did not build anything; people built it. So we need the past passive: "was built".',
  },
  {
    id: "g-b1-05",
    level: "B1",
    prompt: "When I was a child, I ___ play outside every afternoon.",
    options: ["used to", "use to", "was used to", "am used to"],
    answer: 0,
    explanation: '"Used to" + verb describes a past habit. "Be used to" means "be familiar with" and needs -ing.',
  },
  {
    id: "g-b1-06",
    level: "B1",
    prompt: "My dad enjoys ___ for the whole family on weekends.",
    options: ["to cook", "cook", "cooking", "cooked"],
    answer: 2,
    explanation: 'The verb "enjoy" is followed by the -ing form, not "to" + verb.',
  },
  {
    id: "g-b1-07",
    level: "B1",
    prompt: "The woman ___ lives next door is a nurse.",
    options: ["which", "who", "whose", "where"],
    answer: 1,
    explanation: 'We use "who" for people in relative clauses. "Which" is for things.',
  },
  {
    id: "g-b1-08",
    level: "B1",
    prompt: "I have to ___ a decision about which class to take by Friday.",
    options: ["do", "get", "put", "make"],
    answer: 3,
    explanation: 'The correct collocation is "make a decision". We don\'t say "do a decision".',
  },

  // ───────────────────────────── B2 ─────────────────────────────
  {
    id: "g-b2-01",
    level: "B2",
    prompt: "If we ___ earlier, we wouldn't have missed the bus.",
    options: ["left", "had left", "would leave", "have left"],
    answer: 1,
    explanation: 'This is an imagined past (third conditional): "if" + past perfect, then "would have" + past participle.',
  },
  {
    id: "g-b2-02",
    level: "B2",
    prompt: "He asked me where ___.",
    options: ["did I live", "do I live", "I lived", "I am live"],
    answer: 2,
    explanation: 'In reported questions, we use normal word order (subject + verb) and no "do/did": "where I lived".',
  },
  {
    id: "g-b2-03",
    level: "B2",
    prompt: "Sam's car isn't in the driveway. He ___ already left for work.",
    options: ["must", "had to", "can't have", "must have"],
    answer: 3,
    explanation: 'For a confident guess about the past, we use "must have" + past participle. The missing car is the evidence.',
  },
  {
    id: "g-b2-04",
    level: "B2",
    prompt: "I wish I ___ speak Japanese. It would make my trip so much easier.",
    options: ["could", "can", "will", "would"],
    answer: 0,
    explanation: 'For a present wish about ability, we use "wish" + "could". "Wish I can" and "wish I would" are wrong here.',
  },
  {
    id: "g-b2-05",
    level: "B2",
    prompt: "I'm going to ___ my hair cut on Saturday.",
    options: ["make", "have", "let", "do"],
    answer: 1,
    explanation: 'The causative "have something done" means another person does it for you, like a hairdresser.',
  },
  {
    id: "g-b2-06",
    level: "B2",
    prompt: "When we got to the theater, the movie ___ already started.",
    options: ["has", "did", "had", "have"],
    answer: 2,
    explanation: 'The movie started before we arrived (both in the past), so we use the past perfect: "had started".',
  },
  {
    id: "g-b2-07",
    level: "B2",
    prompt: "The school decided to ___ the concert until next month because of the storm.",
    options: ["put off", "put out", "put up", "put on"],
    answer: 0,
    explanation: '"Put off" means postpone, and it fits with "until next month". "Put on" a concert means to organize it.',
  },
  {
    id: "g-b2-08",
    level: "B2",
    prompt: "When planning the trip, we need to ___ into account the cost of meals.",
    options: ["make", "bring", "put", "take"],
    answer: 3,
    explanation: 'The fixed expression is "take something into account", meaning consider it.',
  },

  // ───────────────────────────── C1 ─────────────────────────────
  {
    id: "g-c1-01",
    level: "C1",
    prompt: "Not only ___ the exam, but she also got the highest score in her class.",
    options: ["she passed", "did she pass", "she did pass", "passed she"],
    answer: 1,
    explanation: 'After "Not only" at the start of a sentence, we invert the subject and auxiliary: "did she pass".',
  },
  {
    id: "g-c1-02",
    level: "C1",
    prompt: "Rarely ___ such a talented young musician.",
    options: ["I have seen", "I saw", "did I saw", "have I seen"],
    answer: 3,
    explanation: 'Negative adverbs like "rarely" at the start need inversion: "have I seen". "Did I saw" has the wrong verb form.',
  },
  {
    id: "g-c1-03",
    level: "C1",
    prompt: "___ I really need right now is a long, quiet weekend.",
    options: ["What", "That", "Which", "It"],
    answer: 0,
    explanation: 'This is a cleft sentence: "What I need is…" means "the thing that I need is…".',
  },
  {
    id: "g-c1-04",
    level: "C1",
    prompt: "___ the report, she emailed it to her manager.",
    options: ["Finished", "Being finished", "Having finished", "To have finish"],
    answer: 2,
    explanation: '"Having finished" is a perfect participle clause: she finished first, then emailed it.',
  },
  {
    id: "g-c1-05",
    level: "C1",
    prompt: "The last bus has already left, so we ___ as well walk home.",
    options: ["might", "should", "must", "would"],
    answer: 0,
    explanation: '"Might as well" is a fixed expression meaning there is no better option. The other modals don\'t combine with "as well" this way.',
  },
  {
    id: "g-c1-06",
    level: "C1",
    prompt: "Had I known about the traffic, I ___ earlier.",
    options: ["would leave", "had left", "will have left", "would have left"],
    answer: 3,
    explanation: '"Had I known" is an inverted third conditional (= If I had known), so the result is "would have left".',
  },
  {
    id: "g-c1-07",
    level: "C1",
    prompt: "The new school policy has ___ a lot of criticism from parents.",
    options: ["pulled", "drawn", "given", "made"],
    answer: 1,
    explanation: 'We say something "draws criticism", meaning it causes people to criticize it.',
  },
  {
    id: "g-c1-08",
    level: "C1",
    prompt: "If you're ever in Boston, the aquarium is ___ worth a visit.",
    options: ["much", "very", "well", "high"],
    answer: 2,
    explanation: 'The natural collocation is "well worth". We can\'t say "very worth".',
  },

  // ───────────────────────────── C2 ─────────────────────────────
  {
    id: "g-c2-01",
    level: "C2",
    prompt: "___ it not for her quick thinking, the whole project would have failed.",
    options: ["Had", "Were", "Was", "Should"],
    answer: 1,
    explanation: '"Were it not for" is a formal inverted conditional. "Had" would need "been": "Had it not been for".',
  },
  {
    id: "g-c2-02",
    level: "C2",
    prompt: "So ___ was the demand for tickets that the website crashed within minutes.",
    options: ["greatly", "much", "great", "many"],
    answer: 2,
    explanation: 'This is "so + adjective + inverted verb … that". The noun "demand" needs the adjective "great".',
  },
  {
    id: "g-c2-03",
    level: "C2",
    prompt: "Little ___ that the small app she built in her bedroom would one day be used by millions.",
    options: ["she knew", "knew she", "she did know", "did she know"],
    answer: 3,
    explanation: '"Little" at the start of a sentence means "not at all" and needs inversion with an auxiliary: "did she know".',
  },
  {
    id: "g-c2-04",
    level: "C2",
    prompt: "___ the weather turn bad, the ceremony will be moved indoors.",
    options: ["Should", "Would", "Were", "Had"],
    answer: 0,
    explanation: '"Should" at the start is a formal way to say "If": "Should the weather turn bad" = "If the weather turns bad".',
  },
  {
    id: "g-c2-05",
    level: "C2",
    prompt: "___ as I admire her work, I can't agree with her latest conclusions.",
    options: ["Very", "Though", "So", "Much"],
    answer: 3,
    explanation: '"Much as I admire…" is a fixed concessive structure meaning "Although I admire… very much".',
  },
  {
    id: "g-c2-06",
    level: "C2",
    prompt: "The first draft of her essay was ___ with errors, so she rewrote it from scratch.",
    options: ["riddled", "crowded", "stuffed", "flooded"],
    answer: 0,
    explanation: '"Riddled with errors" is the fixed collocation for something full of mistakes.',
  },
  {
    id: "g-c2-07",
    level: "C2",
    prompt: "After years of not speaking, the two neighbors finally agreed to bury the ___.",
    options: ["axe", "hatchet", "sword", "knife"],
    answer: 1,
    explanation: 'The idiom is "bury the hatchet", meaning to stop arguing and become friendly again.',
  },
  {
    id: "g-c2-08",
    level: "C2",
    prompt: "The professor's comments were ___: brief, yet full of meaning.",
    options: ["wordy", "verbose", "pithy", "rambling"],
    answer: 2,
    explanation: '"Pithy" means short but meaningful. The other options all mean using too many words.',
  },
];

export const READING: ReadingPassage[] = [
  // ───────────────────────────── A1 ─────────────────────────────
  {
    id: "r-a1-1",
    level: "A1",
    title: "A note on the fridge",
    text:
      "Hi Ben,\n" +
      "I am at the store with Grandma. We need milk, eggs, and bread for dinner. Your sandwich is in the fridge. " +
      "Please feed the cat at 5:00. Her food is in the blue box under the sink. Don't give her milk! " +
      "Dad comes home at 6:30 tonight. Call me if you need help. My phone number is on the door.\n" +
      "Love,\nMom",
    questions: [
      {
        id: "r-a1-1-q1",
        prompt: "Where is Mom now?",
        options: ["at the store", "at home", "at work", "at school"],
        answer: 0,
        explanation: 'Mom writes: "I am at the store with Grandma."',
      },
      {
        id: "r-a1-1-q2",
        prompt: "What does Ben need to do at 5:00?",
        options: ["eat his sandwich", "call Mom", "feed the cat", "buy milk"],
        answer: 2,
        explanation: 'The note says: "Please feed the cat at 5:00."',
      },
      {
        id: "r-a1-1-q3",
        prompt: "Where is the cat's food?",
        options: ["in a blue box", "in the fridge", "on the door", "at the store"],
        answer: 0,
        explanation: 'The note says: "Her food is in the blue box under the sink."',
      },
    ],
  },
  {
    id: "r-a1-2",
    level: "A1",
    title: "Art Club for Teens",
    text:
      "Do you like drawing and painting? Come to our Art Club! " +
      "We meet every Tuesday and Thursday from 4:00 to 5:30 at the Oak Street Library, Room 2. " +
      "The club is free. We have paper, pencils, and paints for you. You only need to bring a small towel. " +
      "The club is for students from 13 to 17 years old. Do you have questions? Email Ms. Rivera at the library.",
    questions: [
      {
        id: "r-a1-2-q1",
        prompt: "When does the club meet?",
        options: ["every day", "on weekends", "two days a week", "once a month"],
        answer: 2,
        explanation: 'The club meets "every Tuesday and Thursday", so two days a week.',
      },
      {
        id: "r-a1-2-q2",
        prompt: "What do students need to bring?",
        options: ["paper", "a towel", "paints", "money"],
        answer: 1,
        explanation: '"You only need to bring a small towel." The club has paper and paints, and it is free.',
      },
      {
        id: "r-a1-2-q3",
        prompt: "Where does the club meet?",
        options: ["at a school", "in a park", "at Ms. Rivera's house", "at the Oak Street Library"],
        answer: 3,
        explanation: 'The ad says: "We meet ... at the Oak Street Library, Room 2."',
      },
    ],
  },

  // ───────────────────────────── A2 ─────────────────────────────
  {
    id: "r-a2-1",
    level: "A2",
    title: "An email from Jamal",
    text:
      "Hi Priya,\n" +
      "Thanks for your email! I had a great weekend. On Saturday, my cousins came to visit from Denver. " +
      "We went to the zoo in the morning, but it was very crowded, so we left early. " +
      "In the afternoon, we played basketball in the park. My cousin Marco is taller than me, but I scored more points! " +
      "On Sunday, it rained all day, so we stayed home and watched movies. " +
      "Next weekend, I'm going to help my dad paint the kitchen. What about you? What are your plans?\n" +
      "Write soon,\nJamal",
    questions: [
      {
        id: "r-a2-1-q1",
        prompt: "Why did they leave the zoo early?",
        options: ["It was raining.", "There were too many people.", "It was closing.", "Marco was tired."],
        answer: 1,
        explanation: 'Jamal says the zoo "was very crowded, so we left early." Crowded means full of people. The rain was on Sunday.',
      },
      {
        id: "r-a2-1-q2",
        prompt: "What did Jamal do on Sunday?",
        options: ["He played basketball.", "He went to the zoo.", "He watched movies at home.", "He painted the kitchen."],
        answer: 2,
        explanation: '"On Sunday, it rained all day, so we stayed home and watched movies."',
      },
      {
        id: "r-a2-1-q3",
        prompt: "Who scored more points in basketball?",
        options: ["Marco", "Priya", "Jamal's dad", "Jamal"],
        answer: 3,
        explanation: 'Jamal writes: "Marco is taller than me, but I scored more points!"',
      },
    ],
  },
  {
    id: "r-a2-2",
    level: "A2",
    title: "Riverside Community Pool",
    text:
      "Riverside Community Pool: Summer Hours\n" +
      "The pool opens for the summer on Saturday, June 1. From Monday to Friday, it is open from 10:00 a.m. to 7:00 p.m. " +
      "On weekends, it opens one hour earlier. Tickets cost $4 for adults and $2 for children under 12. " +
      "Swimming lessons are on Tuesday and Thursday mornings. Lessons are cheaper if you book them online. " +
      "Please note: you cannot eat near the water, but you can eat in the picnic area. " +
      "Children under 8 must always be with an adult. The pool is closed on July 4.",
    questions: [
      {
        id: "r-a2-2-q1",
        prompt: "What time does the pool open on Saturdays?",
        options: ["8:00 a.m.", "9:00 a.m.", "10:00 a.m.", "11:00 a.m."],
        answer: 1,
        explanation: 'On weekdays it opens at 10:00, and "on weekends, it opens one hour earlier", so at 9:00.',
      },
      {
        id: "r-a2-2-q2",
        prompt: "Where can people eat?",
        options: ["next to the pool", "in the water", "in the picnic area", "nowhere at the pool"],
        answer: 2,
        explanation: 'The notice says "you cannot eat near the water, but you can eat in the picnic area."',
      },
      {
        id: "r-a2-2-q3",
        prompt: "How can you pay less for swimming lessons?",
        options: ["Book them online.", "Come on a Tuesday.", "Come before 10:00 a.m.", "Bring a child under 12."],
        answer: 0,
        explanation: '"Lessons are cheaper if you book them online."',
      },
    ],
  },

  // ───────────────────────────── B1 ─────────────────────────────
  {
    id: "r-b1-1",
    level: "B1",
    title: "From empty lot to garden",
    text:
      "When Sofia Martinez moved to Phoenix two years ago, she didn't know anyone in her new neighborhood. " +
      "There was an empty lot behind her apartment building, full of trash and weeds. " +
      "“I walked past it every day and thought it was such a waste,” she says. " +
      "At fifteen, Sofia decided to turn it into a garden. First, she wrote a letter to the city and asked for permission. " +
      "It took three months to get an answer, but finally the city agreed. Then she put up posters asking for volunteers. " +
      "At first, only four people came, but now more than thirty neighbors help out. " +
      "They grow tomatoes, peppers, and herbs, and they give half of the vegetables to a local food bank. " +
      "“The best part isn't the vegetables,” Sofia says. “It's that I know all my neighbors now.”",
    questions: [
      {
        id: "r-b1-1-q1",
        prompt: "What is the article mainly about?",
        options: [
          "how to grow tomatoes in a hot city",
          "how a teenager turned an empty lot into a garden",
          "why cities should give land to young people",
          "how Sofia found a new apartment",
        ],
        answer: 1,
        explanation: "The whole article tells how Sofia changed the empty lot into a garden with her neighbors.",
      },
      {
        id: "r-b1-1-q2",
        prompt: "What happened after Sofia wrote to the city?",
        options: ["She got an answer the next day.", "The city said no at first.", "She waited three months for a reply.", "Thirty neighbors signed her letter."],
        answer: 2,
        explanation: '"It took three months to get an answer, but finally the city agreed."',
      },
      {
        id: "r-b1-1-q3",
        prompt: "For Sofia, what is the best result of the garden?",
        options: ["the free vegetables", "helping the food bank", "cleaning up the trash", "knowing her neighbors"],
        answer: 3,
        explanation: "Sofia says, \"The best part isn't the vegetables. It's that I know all my neighbors now.\"",
      },
    ],
  },
  {
    id: "r-b1-2",
    level: "B1",
    title: "Summer volunteers wanted",
    text:
      "Do you love animals? Lakeview Animal Shelter is looking for volunteers aged 14 and older for this summer. " +
      "Volunteers help us walk dogs, clean cages, and play with the cats so they get used to people. " +
      "You don't need any experience, because we will train you on your first day. " +
      "However, you must be able to work at least two mornings a week from June to August. " +
      "Volunteers under 16 need a form signed by a parent or guardian.\n" +
      "This is a great chance to learn about animal care, and many of our past volunteers have gone on to study veterinary science. " +
      "Volunteers who complete fifty hours will also receive a certificate, which looks great on college applications. " +
      "To apply, fill out the form on our website before May 15. Spaces are limited!",
    questions: [
      {
        id: "r-b1-2-q1",
        prompt: "What is the main purpose of this text?",
        options: ["to ask people to adopt a pet", "to find people to help at an animal shelter", "to advertise a veterinary science course", "to report on a successful summer"],
        answer: 1,
        explanation: 'The shelter "is looking for volunteers" and explains how to apply.',
      },
      {
        id: "r-b1-2-q2",
        prompt: "What must ALL volunteers be able to do?",
        options: ["work at least two mornings a week", "bring a parent on the first day", "show experience with animals", "complete fifty hours before June"],
        answer: 0,
        explanation: '"You must be able to work at least two mornings a week." Only volunteers under 16 need a parent\'s form.',
      },
      {
        id: "r-b1-2-q3",
        prompt: "What do volunteers get after they complete fifty hours?",
        options: ["a free pet", "a place in a college", "a certificate", "a paid job"],
        answer: 2,
        explanation: 'The text says volunteers who complete fifty hours "will also receive a certificate".',
      },
    ],
  },

  // ───────────────────────────── B2 ─────────────────────────────
  {
    id: "r-b2-1",
    level: "B2",
    title: "Let teenagers sleep",
    text:
      "Every school morning, millions of American teenagers drag themselves out of bed before sunrise. " +
      "Many schools start before 7:45 a.m., and the result is a generation of students who are, quite simply, exhausted. " +
      "Research has shown that during adolescence, the body's internal clock shifts, so teenagers naturally feel sleepy later at night and need to sleep later in the morning. " +
      "Asking a sixteen-year-old to be alert in a math class at 7:30 is a bit like asking an adult to concentrate at 4:00 a.m.\n" +
      "Critics argue that later start times would cause problems with bus schedules, sports practices, and parents' work hours. " +
      "These concerns are real, but they are not impossible to solve. " +
      "Districts that have moved their start times to 8:30 or later have generally reported better attendance and fewer students falling asleep in class. " +
      "Some have even seen improvements in grades.\n" +
      "If we truly care about education, we should stop organizing the school day around the convenience of adults. " +
      "A rested student is a better learner, and that should be the priority.",
    questions: [
      {
        id: "r-b2-1-q1",
        prompt: "What is the writer's main argument?",
        options: [
          "Teenagers should go to bed earlier.",
          "Bus schedules need to change first.",
          "Adults need more sleep than teenagers.",
          "Schools should start later in the morning.",
        ],
        answer: 3,
        explanation: "The writer says early starts exhaust students and that the school day should not be organized around adults' convenience.",
      },
      {
        id: "r-b2-1-q2",
        prompt: "Why does the writer mention an adult concentrating at 4:00 a.m.?",
        options: [
          "to show how unnatural early classes are for teenagers",
          "to show that adults also feel tired in the morning",
          "to suggest that adults should work at night",
          "to explain why math is a difficult subject",
        ],
        answer: 0,
        explanation: "It is a comparison: a 7:30 class feels for a teenager like 4:00 a.m. feels for an adult, because their body clock is different.",
      },
      {
        id: "r-b2-1-q3",
        prompt: "How does the writer respond to the critics?",
        options: [
          "by agreeing that the problems cannot be solved",
          "by accepting the problems are real but saying they can be solved",
          "by ignoring their concerns completely",
          "by saying parents should change their jobs",
        ],
        answer: 1,
        explanation: 'The writer says, "These concerns are real, but they are not impossible to solve."',
      },
    ],
  },
  {
    id: "r-b2-2",
    level: "B2",
    title: "Counting birds",
    text:
      "Each winter, thousands of ordinary people across the United States spend a day counting birds. " +
      "The tradition, which began over a century ago, was originally a response to a very different holiday custom: " +
      "hunting competitions in which people tried to shoot as many birds as possible. " +
      "A small group of conservationists proposed counting birds instead, and the idea slowly caught on.\n" +
      "Today, the data collected by these volunteers is taken seriously by scientists. " +
      "Because the counts have been carried out in the same places for decades, researchers can see long-term trends that would be impossible for a single research team to detect. " +
      "For example, the counts have revealed that many species are now spending the winter much farther north than they used to, a change that scientists link to rising temperatures.\n" +
      "Participants don't need to be experts. Beginners are usually paired with experienced birders, and many say the day changes the way they see their own neighborhoods. " +
      "As one first-timer put it, “I had no idea how much was living right outside my window.”",
    questions: [
      {
        id: "r-b2-2-q1",
        prompt: "Why did the bird count begin?",
        options: ["to train new scientists", "to study the effects of cold winters", "to replace a bird-hunting tradition", "to help birds find food in winter"],
        answer: 2,
        explanation: 'It began as "a response to" hunting competitions; conservationists proposed counting birds instead.',
      },
      {
        id: "r-b2-2-q2",
        prompt: "According to the article, why is the volunteers' data valuable?",
        options: [
          "The volunteers are all trained experts.",
          "It is much cheaper than other research.",
          "Scientists choose new places every year.",
          "It has been collected in the same places for decades.",
        ],
        answer: 3,
        explanation: '"Because the counts have been carried out in the same places for decades, researchers can see long-term trends."',
      },
      {
        id: "r-b2-2-q3",
        prompt: "What can we infer about the first-timer quoted at the end?",
        options: [
          "This person had counted birds many times before.",
          "This person was surprised by how many birds live nearby.",
          "This person did not enjoy the experience.",
          "This person plans to become a scientist.",
        ],
        answer: 1,
        explanation: '"I had no idea how much was living right outside my window" shows surprise at the wildlife near home.',
      },
    ],
  },

  // ───────────────────────────── C1 ─────────────────────────────
  {
    id: "r-c1-1",
    level: "C1",
    title: "The myth of multitasking",
    text:
      "The notion that we can perform several demanding tasks at once is remarkably persistent, despite decades of evidence to the contrary. " +
      "What people describe as multitasking is, in most cases, rapid task-switching: the brain shifts its attention back and forth between activities, and each shift carries a small but measurable cost. " +
      "Individually, these costs are trivial; cumulatively, they can reduce productivity considerably and increase the likelihood of errors.\n" +
      "Curiously, those who multitask most often tend to be the least skilled at it. " +
      "Studies comparing heavy and light media multitaskers have found that the former are more easily distracted by irrelevant information, not less. " +
      "One plausible explanation is that habitual multitaskers have trained themselves to respond to every incoming stimulus, at the expense of sustained focus.\n" +
      "None of this is to suggest that all forms of doing two things at once are harmful. " +
      "Walking while holding a conversation, or listening to music while cooking, poses little difficulty, because at least one of the activities is largely automatic. " +
      "The problem arises when both tasks compete for the same limited resource: conscious attention.\n" +
      "Perhaps, then, the most useful skill in an age of constant notifications is not the ability to juggle tasks, but the discipline to resist doing so.",
    questions: [
      {
        id: "r-c1-1-q1",
        prompt: 'In the first paragraph, "cumulatively" is closest in meaning to:',
        options: ["when added together", "when done alone", "in the short term", "by accident"],
        answer: 0,
        explanation: 'The text contrasts "individually" (one at a time) with "cumulatively": small costs become large when they add up.',
      },
      {
        id: "r-c1-1-q2",
        prompt: "What does the writer find surprising about people who multitask often?",
        options: [
          "They are better at ignoring irrelevant information.",
          "They make fewer errors than light multitaskers.",
          "They are more easily distracted than others.",
          "They prefer tasks that are automatic.",
        ],
        answer: 2,
        explanation: '"Curiously" signals surprise: heavy multitaskers "are more easily distracted by irrelevant information, not less."',
      },
      {
        id: "r-c1-1-q3",
        prompt: "Which best describes the writer's overall attitude toward multitasking?",
        options: [
          "enthusiastic support for it in modern life",
          "complete rejection of ever doing two things at once",
          "no clear opinion either way",
          "skepticism, while accepting some exceptions",
        ],
        answer: 3,
        explanation: 'The writer criticizes multitasking but says some combinations, like walking and talking, "pose little difficulty."',
      },
    ],
  },
  {
    id: "r-c1-2",
    level: "C1",
    title: "The empty house",
    text:
      "The house had been sold in March, but it was not until the last box had been carried out that Elena allowed herself to walk through the empty rooms. " +
      "Without furniture, they seemed both larger and less familiar, as though the house had already begun to forget her. " +
      "In the kitchen, the faint outline of the old refrigerator remained on the wall, a pale rectangle where the paint had been protected from twenty years of sunlight.\n" +
      "She had expected to feel sad, and in a way she did. Yet what struck her most was not grief but a strange lightness. " +
      "For years, the house had demanded her attention: the leaking roof, the stubborn back door, the garden that always needed weeding. " +
      "She had kept it going out of loyalty to her parents, long after it had stopped making sense to do so.\n" +
      "Standing by the window, she noticed that the lemon tree her father had planted was flowering again, indifferent to the change of owners. " +
      "The thought did not hurt as much as she had feared. Some things, she decided, could be left behind without being lost.\n" +
      "She locked the door, slid the key through the mail slot for the new owners, and did not look back.",
    questions: [
      {
        id: "r-c1-2-q1",
        prompt: "Why was there a pale rectangle on the kitchen wall?",
        options: [
          "Elena had recently painted that area.",
          "The refrigerator had protected that part from sunlight.",
          "Sunlight had damaged that part of the wall.",
          "The new owners had marked the wall.",
        ],
        answer: 1,
        explanation: 'It was "where the paint had been protected from twenty years of sunlight" by the old refrigerator.',
      },
      {
        id: "r-c1-2-q2",
        prompt: "What is the main feeling Elena experiences in the empty house?",
        options: ["deep regret about selling", "anger at her parents", "fear about the future", "an unexpected sense of relief"],
        answer: 3,
        explanation: '"What struck her most was not grief but a strange lightness": she feels free of the house\'s demands.',
      },
      {
        id: "r-c1-2-q3",
        prompt: 'What does "Some things could be left behind without being lost" suggest?',
        options: [
          "She plans to return to the house one day.",
          "She forgot to pack some of her belongings.",
          "Her memories will stay with her even without the house.",
          "The lemon tree will be moved to her new home.",
        ],
        answer: 2,
        explanation: "After seeing her father's tree, she accepts that leaving the house does not mean losing what it meant to her.",
      },
    ],
  },

  // ───────────────────────────── C2 ─────────────────────────────
  {
    id: "r-c2-1",
    level: "C2",
    title: "The eternal decline of English",
    text:
      "Every generation, it seems, produces its own chorus of complaint about the decline of the language. " +
      "Young people, we are told, can no longer write a proper sentence; their vocabulary is impoverished, their grammar slovenly, their attention spans fatally abbreviated by technology. " +
      "What is rarely acknowledged is how old this lament is. " +
      "Similar grievances can be found in essays written two and even three centuries ago, often directed at usages that are now considered entirely unremarkable.\n" +
      "This is not to say that all change is benign, or that standards are meaningless. " +
      "A shared written standard serves real purposes: it allows a scientist in Ohio to be understood by a reader in Singapore, and it gives students access to texts and institutions that might otherwise remain closed to them. " +
      "The point, rather, is that the standard itself is a moving target, shaped by precisely the kind of everyday innovation that purists deplore.\n" +
      "Linguists tend to regard language change much as biologists regard evolution: not as progress or decay, but as adaptation. " +
      "A new word or construction spreads because it meets a need, however modest, and fades when that need disappears. " +
      "Seen in this light, the complaint that young people are “ruining” English rests on a misunderstanding. " +
      "They are doing what speakers have always done, and what the critics' own grandparents were once scolded for doing.\n" +
      "None of which will silence the chorus, of course. But it might temper its volume.",
    questions: [
      {
        id: "r-c2-1-q1",
        prompt: "What is the writer's main purpose?",
        options: [
          "to show that complaints about language decline misunderstand how language works",
          "to support the view that English is in serious decline",
          "to propose new grammar rules for young writers",
          "to explain how biologists study evolution",
        ],
        answer: 0,
        explanation: 'The writer argues that change is adaptation and that the "ruining" complaint "rests on a misunderstanding."',
      },
      {
        id: "r-c2-1-q2",
        prompt: "Why does the writer mention a scientist in Ohio and a reader in Singapore?",
        options: [
          "to suggest that scientists write more clearly than others",
          "to prove that written standards never change",
          "to illustrate a genuine benefit of a shared standard",
          "to criticize the way English is taught abroad",
        ],
        answer: 2,
        explanation: 'It is given as an example of the "real purposes" a shared written standard serves.',
      },
      {
        id: "r-c2-1-q3",
        prompt: "The tone of the final two sentences is best described as:",
        options: ["openly optimistic", "bitterly angry", "deeply anxious", "wryly realistic"],
        answer: 3,
        explanation: 'The writer admits complaints "will" continue (realistic) but hopes, with dry humor, to make them quieter. That is not open optimism.',
      },
    ],
  },
  {
    id: "r-c2-2",
    level: "C2",
    title: "In defense of boredom",
    text:
      "We have, in recent years, become remarkably efficient at eliminating boredom. " +
      "Every pause in the day, whether the wait for a bus or the minutes before a class begins, can now be filled instantly with something to read, watch, or scroll through. " +
      "It would seem churlish to complain about this. Boredom, after all, is unpleasant; few people would choose it over entertainment.\n" +
      "And yet a growing body of research suggests that something may be lost when idle moments disappear. " +
      "In one frequently cited experiment, participants who had first completed a deliberately tedious task went on to produce more original ideas than those who had not. " +
      "The researchers proposed that boredom, far from being a mere absence of stimulation, prompts the mind to wander, and that this wandering is fertile ground for creativity.\n" +
      "It would be naive to romanticize boredom. Chronic, inescapable tedium is corrosive, and nobody is arguing that students should be condemned to empty afternoons in the name of artistic development. " +
      "The claim is subtler: that occasional, unstructured stretches of time allow the mind to make connections it would not otherwise make, and that a life entirely without them may be poorer for it.\n" +
      "Perhaps the answer is not to seek boredom out, but simply to stop fleeing from it quite so reflexively. " +
      "The next time the bus is late, one might leave the phone in one's pocket and see where one's thoughts drift.",
    questions: [
      {
        id: "r-c2-2-q1",
        prompt: 'In the first paragraph, "churlish" most nearly means:',
        options: ["highly scientific", "unreasonably ungracious", "surprisingly common", "extremely boring"],
        answer: 1,
        explanation: "Since boredom is unpleasant and entertainment is welcome, complaining about losing boredom would seem rude and ungrateful.",
      },
      {
        id: "r-c2-2-q2",
        prompt: "What did the experiment described in the text suggest?",
        options: [
          "Boring tasks make people less creative.",
          "Participants preferred tedious tasks to entertainment.",
          "Creativity depends mainly on entertainment.",
          "People who first did a dull task produced more original ideas.",
        ],
        answer: 3,
        explanation: 'Participants who "first completed a deliberately tedious task went on to produce more original ideas."',
      },
      {
        id: "r-c2-2-q3",
        prompt: "What is the writer's position on boredom?",
        options: [
          "Occasional boredom may be valuable and need not always be avoided.",
          "It should be actively sought out as often as possible.",
          "It is harmful in all its forms.",
          "It is useful only for artists.",
        ],
        answer: 0,
        explanation: 'The writer says not "to seek boredom out" but "to stop fleeing from it", since occasional idle time helps the mind.',
      },
    ],
  },
];

export const LISTENING: ListeningClip[] = [
  // ───────────────────────────── A1 ─────────────────────────────
  {
    id: "l-a1-1",
    level: "A1",
    context: "A voicemail from a friend.",
    script:
      "Hi Lucas, it's Mia. I'm at the park with my brother. We have a soccer ball. Do you want to play? " +
      "We are near the big tree. Come at 4:00. Bring water. It's very hot today. See you soon!",
    questions: [
      {
        id: "l-a1-1-q1",
        prompt: "Where is Mia?",
        options: ["at the park", "at school", "at home", "at the store"],
        answer: 0,
        explanation: 'Mia says: "I\'m at the park with my brother."',
      },
      {
        id: "l-a1-1-q2",
        prompt: "What time should Lucas come?",
        options: ["2:00", "3:00", "4:00", "5:00"],
        answer: 2,
        explanation: 'Mia says: "Come at 4:00."',
      },
      {
        id: "l-a1-1-q3",
        prompt: "What should Lucas bring?",
        options: ["a ball", "food", "a jacket", "water"],
        answer: 3,
        explanation: 'Mia says: "Bring water." They already have a ball.',
      },
    ],
  },
  {
    id: "l-a1-2",
    level: "A1",
    context: "A conversation in a café.",
    script:
      "A: Hello. Can I help you?\n" +
      "B: Yes. Can I have a sandwich, please?\n" +
      "A: Chicken or cheese?\n" +
      "B: Cheese, please. And an orange juice.\n" +
      "A: Small or large?\n" +
      "B: Large, please.\n" +
      "A: Okay. That's $19.\n" +
      "B: Here you go. Thank you!",
    questions: [
      {
        id: "l-a1-2-q1",
        prompt: "What sandwich does the customer want?",
        options: ["chicken", "egg", "fish", "cheese"],
        answer: 3,
        explanation: 'The customer says: "Cheese, please."',
      },
      {
        id: "l-a1-2-q2",
        prompt: "What drink does the customer order?",
        options: ["a small orange juice", "a large orange juice", "a large water", "a small milk"],
        answer: 1,
        explanation: 'The customer asks for an orange juice, then says "Large, please."',
      },
      {
        id: "l-a1-2-q3",
        prompt: "How much does it cost?",
        options: ["$19", "$9", "$15", "$90"],
        answer: 0,
        explanation: 'The worker says: "That\'s nineteen dollars." Listen carefully: nineteen, not nine or ninety.',
      },
    ],
  },

  // ───────────────────────────── A2 ─────────────────────────────
  {
    id: "l-a2-1",
    level: "A2",
    context: "An announcement at a high school.",
    script:
      "Good morning, students. This is Mr. Thompson with today's announcements. " +
      "The school trip to the science museum is now on Friday, not Thursday. " +
      "The bus leaves at 8:15, so please don't be late. Remember to bring your permission form and a packed lunch. " +
      "The museum café is closed this week. " +
      "Also, the basketball game tonight starts at 6:30 in the main gym. Have a great day!",
    questions: [
      {
        id: "l-a2-1-q1",
        prompt: "When is the museum trip now?",
        options: ["Wednesday", "Thursday", "Friday", "Saturday"],
        answer: 2,
        explanation: 'Mr. Thompson says the trip "is now on Friday, not Thursday."',
      },
      {
        id: "l-a2-1-q2",
        prompt: "Why do students need a packed lunch?",
        options: ["The trip is very long.", "The museum café is closed.", "Food at the museum is expensive.", "The bus does not stop for lunch."],
        answer: 1,
        explanation: 'He asks students to bring a packed lunch and says "the museum café is closed this week."',
      },
      {
        id: "l-a2-1-q3",
        prompt: "Where is the basketball game?",
        options: ["in the main gym", "at the museum", "in the park", "in the café"],
        answer: 0,
        explanation: '"The basketball game tonight starts at 6:30 in the main gym."',
      },
    ],
  },
  {
    id: "l-a2-2",
    level: "A2",
    context: "Two friends make plans for the weekend.",
    script:
      "A: Hey Aisha, are you free on Saturday?\n" +
      "B: In the morning I have a piano lesson, but I'm free after lunch. Why?\n" +
      "A: There's a new movie at the theater downtown. Do you want to go?\n" +
      "B: Sure. What time does it start?\n" +
      "A: There are shows at 2:00 and 5:00.\n" +
      "B: Let's go to the early one. Then we can get pizza after.\n" +
      "A: Great idea. I'll buy the tickets online tonight.",
    questions: [
      {
        id: "l-a2-2-q1",
        prompt: "What does Aisha do on Saturday morning?",
        options: ["She watches a movie.", "She has a piano lesson.", "She eats pizza.", "She buys tickets."],
        answer: 1,
        explanation: 'Aisha says: "In the morning I have a piano lesson."',
      },
      {
        id: "l-a2-2-q2",
        prompt: "What time will they see the movie?",
        options: ["5:00", "12:00", "7:00", "2:00"],
        answer: 3,
        explanation: 'The shows are at 2:00 and 5:00, and Aisha says "Let\'s go to the early one," so 2:00.',
      },
      {
        id: "l-a2-2-q3",
        prompt: "What will Aisha's friend do tonight?",
        options: ["buy the tickets", "call Aisha", "make pizza", "practice the piano"],
        answer: 0,
        explanation: 'The friend says: "I\'ll buy the tickets online tonight."',
      },
    ],
  },

  // ───────────────────────────── B1 ─────────────────────────────
  {
    id: "l-b1-1",
    level: "B1",
    context: "A voicemail from a dentist's office.",
    script:
      "Hello, this is Karen from Maple Street Dental, calling for Daniel Park. " +
      "I'm calling about your appointment on Tuesday, the fifteenth, at 3:45. " +
      "Unfortunately, Dr. Hughes has to attend a conference that day, so we need to move your appointment. " +
      "We have two options. You can come on Monday, the fourteenth, at 4:00, or on Thursday, the seventeenth, at 10:30 in the morning. " +
      "Please call us back by Friday to let us know which time works for you. " +
      "If neither time is good, we can find another day next week. Thank you, and have a nice day.",
    questions: [
      {
        id: "l-b1-1-q1",
        prompt: "Why does the office need to change the appointment?",
        options: ["Daniel is sick.", "The dentist will be at a conference.", "The office is closing early.", "Daniel asked to change it."],
        answer: 1,
        explanation: 'Karen says Dr. Hughes "has to attend a conference that day."',
      },
      {
        id: "l-b1-1-q2",
        prompt: "Which of these is one of the new times offered?",
        options: ["Tuesday at 3:45", "Thursday at 4:00", "Friday at 10:30", "Monday at 4:00"],
        answer: 3,
        explanation: "The options are Monday at 4:00 or Thursday at 10:30. Tuesday at 3:45 is the old appointment.",
      },
      {
        id: "l-b1-1-q3",
        prompt: "What should Daniel do by Friday?",
        options: ["call the office back", "come to the office", "send an email", "find a new dentist"],
        answer: 0,
        explanation: 'Karen asks: "Please call us back by Friday."',
      },
    ],
  },
  {
    id: "l-b1-2",
    level: "B1",
    context: "Two classmates talk about a school project.",
    script:
      "A: Hi Diego. Have you started the history project yet?\n" +
      "B: Not really. I've chosen my topic, but I haven't done any research.\n" +
      "A: What's your topic?\n" +
      "B: The building of the Golden Gate Bridge. My grandfather used to live in San Francisco, so he's going to tell me some stories.\n" +
      "A: That sounds interesting. I'm doing mine on the first public libraries.\n" +
      "B: Nice. When is it due again?\n" +
      "A: Next Wednesday. But Ms. Clark said we have to give her an outline by this Friday.\n" +
      "B: Friday? I didn't know that. I'd better start tonight.",
    questions: [
      {
        id: "l-b1-2-q1",
        prompt: "How much of the project has Diego done?",
        options: ["He has finished the research.", "He has only chosen a topic.", "He has written an outline.", "He hasn't chosen a topic yet."],
        answer: 1,
        explanation: "Diego says: \"I've chosen my topic, but I haven't done any research.\"",
      },
      {
        id: "l-b1-2-q2",
        prompt: "Why can Diego's grandfather help him?",
        options: ["He is a history teacher.", "He helped build the bridge.", "He used to live in San Francisco.", "He works at a public library."],
        answer: 2,
        explanation: 'Diego says his grandfather "used to live in San Francisco," so he can tell stories about the bridge.',
      },
      {
        id: "l-b1-2-q3",
        prompt: "What new information does Diego learn?",
        options: ["The project is due on Friday.", "Ms. Clark changed his topic.", "The library is closed on Wednesday.", "He must give Ms. Clark an outline by Friday."],
        answer: 3,
        explanation: 'The project is due Wednesday, but "we have to give her an outline by this Friday." Diego says, "I didn\'t know that."',
      },
    ],
  },

  // ───────────────────────────── B2 ─────────────────────────────
  {
    id: "l-b2-1",
    level: "B2",
    context: "A short segment from a local radio station.",
    script:
      "Good afternoon, and welcome back to City Talk. If you've driven down Maple Avenue lately, you've probably noticed the construction. " +
      "The city is replacing water pipes that were installed more than eighty years ago, and officials admit the work should have been finished by now. " +
      "Heavy rain in April delayed the project by about three weeks. " +
      "The good news is that the eastern half of the avenue reopened this morning. " +
      "The western half will remain closed until the end of the month, so drivers heading downtown are advised to use Pine Street instead. " +
      "Local businesses say they've lost customers during the closure, and the city council will discuss possible support for them at next Tuesday's meeting.",
    questions: [
      {
        id: "l-b2-1-q1",
        prompt: "Why is there construction on Maple Avenue?",
        options: ["Old water pipes are being replaced.", "The road is being made wider.", "Storm damage is being repaired.", "A new shopping area is being built."],
        answer: 0,
        explanation: '"The city is replacing water pipes that were installed more than eighty years ago." The rain only caused a delay.',
      },
      {
        id: "l-b2-1-q2",
        prompt: "What do we learn about the project's schedule?",
        options: ["It is ahead of schedule.", "It started in April.", "It will finish next Tuesday.", "It is behind schedule because of rain."],
        answer: 3,
        explanation: 'The work "should have been finished by now" and rain "delayed the project by about three weeks."',
      },
      {
        id: "l-b2-1-q3",
        prompt: "What will the city council discuss?",
        options: ["closing Pine Street", "new prices for water", "help for local businesses", "the next construction project"],
        answer: 2,
        explanation: 'The council "will discuss possible support for" local businesses that lost customers.',
      },
    ],
  },
  {
    id: "l-b2-2",
    level: "B2",
    context: "Two friends talk about something that is missing.",
    script:
      "A: Have you seen my headphones? I can't find them anywhere.\n" +
      "B: You had them on the bus this morning, didn't you?\n" +
      "A: Yes, I was listening to music the whole way. And I haven't been home since, so they can't be there.\n" +
      "B: Did you take them off when we got to the library?\n" +
      "A: I think so. I put them on the table while I was looking for a book.\n" +
      "B: Then you must have left them there. Maybe someone handed them in at the front desk.\n" +
      "A: I hope so. The library closes at 6:00, right?\n" +
      "B: On weekdays it does, but today's Saturday, so it closes at 5:00. You'd better hurry.\n" +
      "A: It's 4:40 now. If I run, I might make it.",
    questions: [
      {
        id: "l-b2-2-q1",
        prompt: "Where does the second friend think the headphones probably are?",
        options: ["at the library", "on the bus", "at home", "in a backpack"],
        answer: 0,
        explanation: 'The headphones were put on a library table, so the friend says, "Then you must have left them there."',
      },
      {
        id: "l-b2-2-q2",
        prompt: "What time does the library close today?",
        options: ["4:40", "5:00", "5:40", "6:00"],
        answer: 1,
        explanation: 'It closes at 6:00 on weekdays, but "today\'s Saturday, so it closes at 5:00."',
      },
      {
        id: "l-b2-2-q3",
        prompt: "Why can't the headphones be at home?",
        options: [
          "Their owner lent them to a neighbor.",
          "Their owner never takes them home.",
          "Their owner hasn't been home since the bus ride.",
          "Their owner's family already looked there.",
        ],
        answer: 2,
        explanation: "The owner used them on the bus this morning and says, \"I haven't been home since, so they can't be there.\"",
      },
    ],
  },

  // ───────────────────────────── C1 ─────────────────────────────
  {
    id: "l-c1-1",
    level: "C1",
    context: "Part of a lecture in an introductory psychology class.",
    script:
      "Today I want to talk about something called the spacing effect. " +
      "It's one of the most reliable findings in the psychology of learning, and yet most students ignore it completely. " +
      "The idea is simple. If you study the same material in several short sessions spread out over days, you'll remember it far better than if you study for the same total amount of time in one long session. " +
      "In other words, cramming the night before an exam might help you pass the next morning, but most of what you learn will be gone within a week. " +
      "Now, why don't more people use spacing? Partly because cramming feels more effective. " +
      "When you review something over and over in one sitting, it starts to seem familiar, and we mistake that familiarity for real understanding. " +
      "So for this course, I'd strongly encourage you to review your notes a little every few days.",
    questions: [
      {
        id: "l-c1-1-q1",
        prompt: "What is the spacing effect?",
        options: [
          "Studying in one long session helps you remember more.",
          "Spreading study over several short sessions improves memory.",
          "Taking breaks during an exam improves your score.",
          "Reviewing notes the night before an exam is most effective.",
        ],
        answer: 1,
        explanation: 'Short sessions "spread out over days" help you remember "far better" than one long session.',
      },
      {
        id: "l-c1-1-q2",
        prompt: "According to the speaker, what is the problem with cramming?",
        options: ["It never helps students pass.", "It takes more total time.", "Most of the material is soon forgotten.", "It makes the material feel unfamiliar."],
        answer: 2,
        explanation: 'Cramming "might help you pass," but "most of what you learn will be gone within a week."',
      },
      {
        id: "l-c1-1-q3",
        prompt: "Why, according to the speaker, do students prefer cramming?",
        options: ["They have no other time to study.", "Teachers usually recommend it.", "It is less tiring than spacing.", "They confuse familiarity with understanding."],
        answer: 3,
        explanation: 'The material "starts to seem familiar, and we mistake that familiarity for real understanding."',
      },
    ],
  },
  {
    id: "l-c1-2",
    level: "C1",
    context: "A radio interview with a wildlife photographer.",
    script:
      "A: You spend weeks at a time in remote places waiting for a single photograph. What keeps you going?\n" +
      "B: Honestly, it's not the photograph. People assume the final image is the reward, but by the time I've got it, I've usually spent a month watching the animals and learning their routines. That's the part I love.\n" +
      "A: Has the job changed since you started?\n" +
      "B: Enormously. When I began, the challenge was getting close enough to an animal. Now, with long lenses and remote cameras, that's much easier. " +
      "The hard part these days is getting people to care. Everyone's seen a thousand stunning wildlife images, so a beautiful picture alone doesn't do much anymore.\n" +
      "A: So what does?\n" +
      "B: A story. If I can show why a particular animal is struggling, and what's being done about it, people pay attention in a way they never would for a pretty picture.",
    questions: [
      {
        id: "l-c1-2-q1",
        prompt: "What does the photographer enjoy most about the work?",
        options: ["getting the final image", "using new camera technology", "observing animals over long periods", "traveling to famous places"],
        answer: 2,
        explanation: "\"It's not the photograph… I've usually spent a month watching the animals… That's the part I love.\"",
      },
      {
        id: "l-c1-2-q2",
        prompt: "What is the biggest challenge now, according to the photographer?",
        options: ["making people care about the images", "getting close enough to animals", "finding remote places to work", "paying for expensive equipment"],
        answer: 0,
        explanation: 'Getting close is "much easier" now; "the hard part these days is getting people to care."',
      },
      {
        id: "l-c1-2-q3",
        prompt: "What is implied about beautiful wildlife pictures today?",
        options: ["They are harder to take than before.", "They have little impact on their own.", "They are rarely published.", "They work better than stories."],
        answer: 1,
        explanation: '"A beautiful picture alone doesn\'t do much anymore" because people have seen so many.',
      },
    ],
  },

  // ───────────────────────────── C2 ─────────────────────────────
  {
    id: "l-c2-1",
    level: "C2",
    context: "An excerpt from a university lecture on urban history.",
    script:
      "It's tempting to think of the American suburb as a natural expression of people's desire for space and privacy. " +
      "But that account leaves out a great deal. The rapid growth of suburbs in the late 1940s and 1950s was not simply the result of millions of individual choices. " +
      "It was underwritten by deliberate policy. Federal mortgage programs made it far cheaper to buy a new house on the edge of a city than to renovate an older one in the center, " +
      "and massive highway construction made long commutes practical for the first time. In other words, the playing field was tilted. " +
      "Now, I'm not suggesting that people were tricked into moving, or that they didn't genuinely value what the suburbs offered. They clearly did. " +
      "My point is that preferences don't form in a vacuum. When we ask why Americans live where they do, " +
      "we have to look not only at what people wanted, but at which options were made easy and which were quietly made difficult.",
    questions: [
      {
        id: "l-c2-1-q1",
        prompt: "What is the speaker's main point?",
        options: [
          "Suburbs grew only because people wanted privacy.",
          "Government policy strongly shaped where people chose to live.",
          "People were tricked into moving to the suburbs.",
          "City centers were more popular than the suburbs.",
        ],
        answer: 1,
        explanation: 'Suburban growth "was underwritten by deliberate policy"; we must look at "which options were made easy."',
      },
      {
        id: "l-c2-1-q2",
        prompt: 'What does the speaker mean by "the playing field was tilted"?',
        options: [
          "Some choices were made much easier than others.",
          "Many suburbs were built on hills.",
          "Competition between cities was fair.",
          "The new highways were poorly built.",
        ],
        answer: 0,
        explanation: "Mortgage programs and highways made suburban living cheaper and easier, so the options were not equal.",
      },
      {
        id: "l-c2-1-q3",
        prompt: "What does the speaker concede?",
        options: ["The highways were unnecessary.", "The mortgage programs were a mistake.", "Older homes in the center were cheaper.", "People genuinely valued suburban life."],
        answer: 3,
        explanation: 'The speaker admits people did "genuinely value what the suburbs offered. They clearly did."',
      },
    ],
  },
  {
    id: "l-c2-2",
    level: "C2",
    context: "A radio interview with a literary translator.",
    script:
      "A: People often say that something is always lost in translation. Do you agree?\n" +
      "B: I'd put it slightly differently. Something is always changed in translation, and change isn't necessarily loss. " +
      "Sometimes a joke that works in Spanish simply won't land in English, so I have to invent a different joke that does the same job. " +
      "A reader comparing the two lines might call that unfaithful.\n" +
      "A: Would you?\n" +
      "B: Not at all. I'd argue it's more faithful, just not to the words. My loyalty is to the effect the original had on its readers. " +
      "If I translate every word accurately and the result is lifeless, I've failed, however correct it may look on paper. A translation that reads like a dictionary entry does the author no favors.\n" +
      "A: That must make some authors nervous.\n" +
      "B: Some, yes. But the ones I've worked with most closely tend to understand, because they know their readers better than anyone. " +
      "One of them once told me she'd rather be well betrayed than badly obeyed.",
    questions: [
      {
        id: "l-c2-2-q1",
        prompt: "How does the translator respond to the idea that something is always lost in translation?",
        options: [
          "by agreeing with it completely",
          "by saying jokes should never be translated",
          "by saying things always change, which isn't always loss",
          "by saying good translators never change anything",
        ],
        answer: 2,
        explanation: 'The translator says, "Something is always changed in translation, and change isn\'t necessarily loss."',
      },
      {
        id: "l-c2-2-q2",
        prompt: "What is the translator most loyal to?",
        options: ["the exact words of the original", "the wishes of the publisher", "the rules of English grammar", "the effect the original had on its readers"],
        answer: 3,
        explanation: '"My loyalty is to the effect the original had on its readers," not to the words.',
      },
      {
        id: "l-c2-2-q3",
        prompt: 'What does the author\'s remark "well betrayed than badly obeyed" suggest?',
        options: [
          "She prefers a free translation that works to a literal one that doesn't.",
          "She does not trust translators with her work.",
          "She wants every word translated literally.",
          "She regrets working with this translator.",
        ],
        answer: 0,
        explanation: 'She would rather have her words changed ("betrayed") if the result is good than followed exactly ("obeyed") with a dull result.',
      },
    ],
  },
];

export const SPEAKING_CAN_DO: CanDo[] = [
  {
    level: "A1",
    statement: "I can say hello, say my name, and answer very simple questions about me, like where I live and what I like.",
  },
  {
    level: "A2",
    statement: "I can talk about my family, my school or job, and my day with short, simple sentences.",
  },
  {
    level: "B1",
    statement: "I can talk about my experiences, plans, and opinions, and keep a conversation going on everyday topics.",
  },
  {
    level: "B2",
    statement: "I can speak clearly and in detail about many topics, explain my point of view, and talk with native speakers without much effort on either side.",
  },
  {
    level: "C1",
    statement: "I can express myself fluently and naturally, without searching for words, and use English flexibly for social, academic, and work purposes.",
  },
  {
    level: "C2",
    statement: "I can take part in any conversation with ease, express fine shades of meaning precisely, and rephrase smoothly when I have a problem.",
  },
];
