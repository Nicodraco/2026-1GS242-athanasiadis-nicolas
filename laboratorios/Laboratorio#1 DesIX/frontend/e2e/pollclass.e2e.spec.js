import { expect, test } from "@playwright/test";

const API_BASE_URL = "http://localhost:4000/api";
const PASSWORD = "test1234";

function uniqueEmail(prefix) {
  const now = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return `${prefix}.${now}.${random}@pollclass.local`;
}

async function registerWithUI(page, { name, email, role }) {
  await page.goto("/auth");
  await page.getByTestId("auth-mode-register").click();
  await page.getByTestId("auth-name-input").fill(name);
  await page.getByTestId("auth-role-select").selectOption(role);
  await page.getByTestId("auth-email-input").fill(email);
  await page.getByTestId("auth-password-input").fill(PASSWORD);
  await page.getByTestId("auth-submit-button").click();
}

async function createPollSeed(request) {
  const teacherEmail = uniqueEmail("e2e.teacher.seed");
  const teacherRegister = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      name: "Teacher Seed",
      email: teacherEmail,
      password: PASSWORD,
      role: "teacher",
    },
  });
  expect(teacherRegister.ok()).toBeTruthy();
  const teacherAuth = await teacherRegister.json();

  const createPoll = await request.post(`${API_BASE_URL}/polls`, {
    headers: {
      Authorization: `Bearer ${teacherAuth.token}`,
    },
    data: {
      question: "Encuesta E2E",
      options: ["Opcion A", "Opcion B"],
    },
  });
  expect(createPoll.ok()).toBeTruthy();
  return createPoll.json();
}

test("flujo profesor: registro y creacion de encuesta", async ({ page }) => {
  const teacherEmail = uniqueEmail("e2e.teacher.ui");
  await registerWithUI(page, {
    name: "Profesor E2E",
    email: teacherEmail,
    role: "teacher",
  });

  await expect(page).toHaveURL(/\/teacher$/);
  await page.getByTestId("teacher-question-input").fill("Pregunta E2E desde UI");
  await page.getByTestId("teacher-option-input-0").fill("Primera opcion");
  await page.getByTestId("teacher-option-input-1").fill("Segunda opcion");
  await page.getByTestId("teacher-create-poll-button").click();

  await expect(page.getByTestId("teacher-results-section")).toBeVisible();
  const pollCode = await page.getByTestId("teacher-results-code").innerText();
  expect(pollCode).toMatch(/^[A-Z0-9]{6}$/);
  await expect(page.getByTestId(`teacher-poll-card-${pollCode}`)).toBeVisible();
});

test("flujo estudiante: entrar por codigo y votar una sola vez", async ({
  page,
  request,
}) => {
  const poll = await createPollSeed(request);
  const studentEmail = uniqueEmail("e2e.student.ui");
  await registerWithUI(page, {
    name: "Estudiante E2E",
    email: studentEmail,
    role: "student",
  });

  await expect(page).toHaveURL(/\/$/);
  await page.getByTestId("landing-code-input").fill(poll.code);
  await page.getByTestId("landing-join-button").click();

  await expect(page).toHaveURL(new RegExp(`/poll/${poll.code}$`));
  await page.getByRole("radio").first().check();
  await page.getByTestId("student-submit-vote-button").click();

  await expect(page.getByTestId("student-submit-vote-button")).toHaveText("Ya votaste");
  await expect(
    page.getByRole("heading", { name: /Resultados en vivo \(1 votos\)/ })
  ).toBeVisible();
});

test("caso negativo: estudiante no puede entrar a vista de profesor", async ({
  page,
}) => {
  const studentEmail = uniqueEmail("e2e.student.forbidden");
  await registerWithUI(page, {
    name: "Estudiante Sin Permiso",
    email: studentEmail,
    role: "student",
  });

  await page.goto("/teacher");
  await expect(page).toHaveURL(/\/auth$/);
  await expect(
    page.getByRole("heading", {
      name: "PollClass Login",
    })
  ).toBeVisible();
});
