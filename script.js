const MAX_LIFE = 5;
const MAX_MONEY = 5;

let life = MAX_LIFE;
let money = MAX_MONEY;

const lifeContainer = document.getElementById("life-container");
const moneyContainer = document.getElementById("money-container");

const screenMain = document.getElementById("screen-main");
const screenQuestion = document.getElementById("screen-question");
const screenGameover = document.getElementById("screen-gameover");

const questionBtn = document.getElementById("question-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");

const questionTitle = document.getElementById("question-title");
const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");
const gameoverTitle = document.getElementById("gameover-title");
const gameoverReason = document.getElementById("gameover-reason");

const QUESTIONS = [
  {
    title: "Safety training budget",
    text: "You are starting a high‑rise construction project. The safety team suggests a full day of on‑site safety training, which will increase both cost and schedule.",
    options: [
      {
        text: "Approve the full training and pay overtime",
        impact: "Life -0, Budget -2 (safer but more expensive)",
        deltaLife: 0,
        deltaMoney: -2,
      },
      {
        text: "Run a half‑day online training only",
        impact: "Life -1, Budget -1 (some training but reduced)",
        deltaLife: -1,
        deltaMoney: -1,
      },
      {
        text: "Skip formal training and send a slide deck",
        impact: "Life -2, Budget 0 (cheaper, but big safety risk)",
        deltaLife: -2,
        deltaMoney: 0,
      },
    ],
  },
  {
    title: "Choosing structural materials",
    text: "You must decide the grade of concrete and steel for the main structure. Safer and lower‑carbon materials are more expensive.",
    options: [
      {
        text: "Use high‑strength, low‑carbon materials and extra inspections",
        impact: "Life -0, Budget -2 (high standard, higher cost)",
        deltaLife: 0,
        deltaMoney: -2,
      },
      {
        text: "Use standard materials at the minimum code requirement",
        impact: "Life -1, Budget -1 (barely compliant)",
        deltaLife: -1,
        deltaMoney: -1,
      },
      {
        text: "Pick the cheapest supplier and simplify inspections",
        impact: "Life -2, Budget 0 (short‑term savings, long‑term risk)",
        deltaLife: -2,
        deltaMoney: 0,
      },
    ],
  },
  {
    title: "Site environmental impact",
    text: "Noise and dust from the site are causing complaints from nearby residents. You need to respond.",
    options: [
      {
        text: "Invest in noise barriers and misting systems",
        impact: "Life -0, Budget -2 (better environment, higher cost)",
        deltaLife: 0,
        deltaMoney: -2,
      },
      {
        text: "Adjust work hours and slightly reduce night shifts",
        impact: "Life -1, Budget -1 (some improvement)",
        deltaLife: -1,
        deltaMoney: -1,
      },
      {
        text: "Keep the current plan and only communicate verbally",
        impact: "Life -2, Budget 0 (pollution continues, public risk)",
        deltaLife: -2,
        deltaMoney: 0,
      },
    ],
  },
  {
    title: "Delay and acceleration",
    text: "Design changes have delayed the project. The client still wants the original completion date, or there will be penalties.",
    options: [
      {
        text: "Negotiate for a schedule extension and keep normal workload",
        impact: "Life -0, Budget -1 (negotiation costs time and money)",
        deltaLife: 0,
        deltaMoney: -1,
      },
      {
        text: "Add moderate overtime, slightly cutting rest time",
        impact: "Life -1, Budget -1 (affects health and cost)",
        deltaLife: -1,
        deltaMoney: -1,
      },
      {
        text: "Aggressively accelerate with long night shifts",
        impact: "Life -2, Budget 0 (severe health and safety impact)",
        deltaLife: -2,
        deltaMoney: 0,
      },
    ],
  },
  {
    title: "Emergency preparedness investment",
    text: "Safety consultants recommend a full emergency system: drills, backup equipment, and supplies.",
    options: [
      {
        text: "Invest fully with regular drills and updated supplies",
        impact: "Life -0, Budget -2 (safest but expensive)",
        deltaLife: 0,
        deltaMoney: -2,
      },
      {
        text: "Keep only the most critical drills and supplies",
        impact: "Life -1, Budget -1 (basically sufficient)",
        deltaLife: -1,
        deltaMoney: -1,
      },
      {
        text: "Postpone investment and keep plans on paper only",
        impact: "Life -2, Budget 0 (weak in real emergencies)",
        deltaLife: -2,
        deltaMoney: 0,
      },
    ],
  },
];

function renderStatus() {
  renderIcons(lifeContainer, life, MAX_LIFE, "❤️");
  renderIcons(moneyContainer, money, MAX_MONEY, "💰");
}

function renderIcons(container, current, max, symbol) {
  container.innerHTML = "";
  for (let i = 0; i < max; i++) {
    const span = document.createElement("span");
    span.className = "icon" + (i < current ? "" : " empty");
    span.textContent = symbol;
    container.appendChild(span);
  }
}

function showScreen(screen) {
  [screenMain, screenQuestion, screenGameover].forEach((el) =>
    el.classList.remove("active")
  );
  screen.classList.add("active");
}

function pickRandomQuestion() {
  const index = Math.floor(Math.random() * QUESTIONS.length);
  return QUESTIONS[index];
}

function openRandomQuestion() {
  const q = pickRandomQuestion();
  questionTitle.textContent = q.title;
  questionText.textContent = q.text;

  optionsContainer.innerHTML = "";
  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";

    const main = document.createElement("div");
    main.className = "option-main";
    main.textContent = opt.text;

    const impact = document.createElement("div");
    impact.className = "option-impact";
    impact.textContent = opt.impact;

    btn.appendChild(main);
    btn.appendChild(impact);

    btn.addEventListener("click", () => {
      life += opt.deltaLife;
      money += opt.deltaMoney;
      life = Math.max(0, Math.min(MAX_LIFE, life));
      money = Math.max(0, Math.min(MAX_MONEY, money));
      renderStatus();
      checkGameOverOrBack();
    });

    optionsContainer.appendChild(btn);
  });

  showScreen(screenQuestion);
}

function checkGameOverOrBack() {
  if (life <= 0 || money <= 0) {
    const reasons = [];
    if (life <= 0) {
      reasons.push(
        "You pushed safety and environmental impact too far. The project is shut down."
      );
    }
    if (money <= 0) {
      reasons.push("The project has completely run out of budget.");
    }

    gameoverTitle.textContent = "Project stopped";
    gameoverReason.textContent =
      reasons.join(" ") +
      " This is a tough lesson. Next time, try to balance life and budget more carefully.";
    showScreen(screenGameover);
  } else {
    showScreen(screenMain);
  }
}

function resetGame() {
  life = MAX_LIFE;
  money = MAX_MONEY;
  renderStatus();
  showScreen(screenMain);
}

questionBtn.addEventListener("click", openRandomQuestion);
backBtn.addEventListener("click", () => showScreen(screenMain));
restartBtn.addEventListener("click", resetGame);

renderStatus();

