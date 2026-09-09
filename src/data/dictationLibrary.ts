export interface DictationTrack {
  id: string;
  title: string;
  speaker: string;
  category: 'SPEECH' | 'TECH' | 'LITERATURE' | 'ATC' | 'COURT';
  defaultSpeed: number; // 0.75, 1.0, 1.25, 1.5
  text: string;
}

export const DICTATION_TRACKS: DictationTrack[] = [
  {
    id: 'steve_jobs_stanford',
    title: 'Stay Hungry, Stay Foolish',
    speaker: 'Steve Jobs (2005)',
    category: 'TECH',
    defaultSpeed: 1.0,
    text: "Your time is limited, so don't waste it living someone else's life. Don't be trapped by dogma, which is living with the results of other people's thinking. Don't let the noise of others' opinions drown out your own inner voice. And most important, have the courage to follow your heart and intuition.",
  },
  {
    id: 'jfk_moon_speech',
    title: 'We Choose to Go to the Moon',
    speaker: 'John F. Kennedy (1962)',
    category: 'SPEECH',
    defaultSpeed: 1.0,
    text: "We choose to go to the moon in this decade and do the other things, not because they are easy, but because they are hard, because that goal will serve to organize and measure the best of our energies and skills, because that challenge is one that we are willing to accept.",
  },
  {
    id: 'apollo_11_descent',
    title: 'Apollo 11 Lunar Landing',
    speaker: 'Neil Armstrong & Houston ATC',
    category: 'ATC',
    defaultSpeed: 1.25,
    text: "Houston, Tranquility Base here. The Eagle has landed. Roger, Tranquility, we copy you on the ground. You got a bunch of guys about to turn blue. We're breathing again. Thanks a lot.",
  },
  {
    id: 'clean_architecture',
    title: 'The Clean Architecture Principle',
    speaker: 'Robert C. Martin',
    category: 'TECH',
    defaultSpeed: 1.0,
    text: "The overriding rule is the dependency rule. Source code dependencies must point only inward, toward higher-level policies. Nothing in an inner circle can know anything at all about something in an outer circle.",
  },
  {
    id: 'mlk_dream',
    title: 'I Have a Dream',
    speaker: 'Martin Luther King Jr. (1963)',
    category: 'SPEECH',
    defaultSpeed: 0.75,
    text: "I have a dream that one day this nation will rise up and live out the true meaning of its creed: We hold these truths to be self-evident, that all men are created equal.",
  },
  {
    id: 'courtroom_opening',
    title: 'Judicial Transcript Dictation',
    speaker: 'Supreme Court Proceedings',
    category: 'COURT',
    defaultSpeed: 1.25,
    text: "May it please the court. The fundamental question before us today concerns the statutory interpretation of regulatory compliance and whether retroactive liability applies under constitutional due process standards.",
  },
  {
    id: 'turing_intelligence',
    title: 'Computing Machinery and Intelligence',
    speaker: 'Alan Turing (1950)',
    category: 'LITERATURE',
    defaultSpeed: 1.0,
    text: "I propose to consider the question, Can machines think? This should begin with definitions of the meaning of the terms machine and think. We may hope that machines will eventually compete with men in all purely intellectual fields.",
  },
];
