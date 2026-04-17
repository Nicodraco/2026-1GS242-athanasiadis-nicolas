import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { api, getAuthToken, setAuthToken } from "./api";

const POLLING_INTERVAL_MS = 3000;

function ResultsChart({ results }) {
  if (!results) return null;
  return (
    <div className="space-y-3">
      <div className="h-64 w-full rounded-lg border bg-white p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={results.options}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="text" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="votes" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        {results.options.map((option) => (
          <div className="rounded-lg border bg-white p-3 text-sm" key={option.id}>
            <div className="mb-2 flex justify-between gap-3">
              <span className="font-medium">{option.text}</span>
              <span>
                {option.votes} votos ({option.percentage}%)
              </span>
            </div>
            <div className="h-2 rounded bg-slate-200">
              <div
                className="h-full rounded bg-blue-600"
                style={{ width: `${option.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "register") {
        const response = await api.post("/auth/register", {
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        });
        onAuth(response.data.user, response.data.token);
        navigate(role === "teacher" ? "/teacher" : "/");
      } else {
        const response = await api.post("/auth/login", {
          email: email.trim(),
          password,
        });
        onAuth(response.data.user, response.data.token);
        navigate(response.data.user.role === "teacher" ? "/teacher" : "/");
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ?? "No se pudo autenticar."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md p-4 sm:p-8">
      <div className="rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-800">PollClass Login</h1>
        <p className="mt-1 text-sm text-slate-600">
          Inicia sesión o crea tu cuenta de profesor/estudiante.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            className={`rounded px-3 py-2 text-sm ${mode === "login" ? "bg-slate-900 text-white" : "bg-slate-200"}`}
            onClick={() => setMode("login")}
            type="button"
          >
            Iniciar sesión
          </button>
          <button
            className={`rounded px-3 py-2 text-sm ${mode === "register" ? "bg-slate-900 text-white" : "bg-slate-200"}`}
            onClick={() => setMode("register")}
            type="button"
          >
            Registrarme
          </button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={submit}>
          {mode === "register" ? (
            <>
              <input
                className="w-full rounded border border-slate-300 p-2"
                onChange={(event) => setName(event.target.value)}
                placeholder="Nombre"
                value={name}
              />
              <select
                className="w-full rounded border border-slate-300 p-2"
                onChange={(event) => setRole(event.target.value)}
                value={role}
              >
                <option value="student">Estudiante</option>
                <option value="teacher">Profesor</option>
              </select>
            </>
          ) : null}
          <input
            className="w-full rounded border border-slate-300 p-2"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Correo"
            type="email"
            value={email}
          />
          <input
            className="w-full rounded border border-slate-300 p-2"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contraseña"
            type="password"
            value={password}
          />
          <button
            className="w-full rounded bg-blue-600 p-2 font-semibold text-white disabled:bg-blue-300"
            disabled={loading}
            type="submit"
          >
            {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>
    </main>
  );
}

function LandingPage({ user, onLogout }) {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  function joinPoll(event) {
    event.preventDefault();
    if (!code.trim()) return;
    navigate(`/poll/${code.trim().toUpperCase()}`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl p-4 sm:p-8">
      <div className="rounded-xl bg-white p-6 shadow sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-bold text-slate-800">PollClass</h1>
          <div className="flex gap-2">
            {user ? (
              <>
                <span className="rounded bg-slate-100 px-3 py-1 text-sm">
                  {user.name} ({user.role === "teacher" ? "Profesor" : "Estudiante"})
                </span>
                <button
                  className="rounded bg-slate-900 px-3 py-1 text-sm text-white"
                  onClick={onLogout}
                  type="button"
                >
                  Salir
                </button>
              </>
            ) : (
              <Link className="rounded bg-slate-900 px-3 py-1 text-sm text-white" to="/auth">
                Login
              </Link>
            )}
          </div>
        </div>
        <p className="mt-2 text-slate-600">
          Sistema de encuestas en vivo con vista de profesor y votador.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {user?.role === "teacher" ? (
            <Link
              className="rounded-lg border border-blue-600 bg-blue-600 p-4 text-center font-semibold text-white hover:bg-blue-700"
              to="/teacher"
            >
              Ir a Vista Profesor
            </Link>
          ) : (
            <Link
              className="rounded-lg border border-slate-300 bg-slate-100 p-4 text-center font-semibold text-slate-500"
              to={user ? "/" : "/auth"}
            >
              {user ? "Solo profesores pueden gestionar encuestas" : "Inicia sesión como profesor"}
            </Link>
          )}

          <form className="rounded-lg border bg-slate-50 p-4" onSubmit={joinPoll}>
            <label className="block text-sm font-medium text-slate-700">
              Código de encuesta
            </label>
            <input
              className="mt-2 w-full rounded border border-slate-300 p-2 uppercase"
              maxLength={6}
              onChange={(event) => setCode(event.target.value)}
              placeholder="ABC123"
              value={code}
            />
            <button
              className="mt-3 w-full rounded bg-slate-900 p-2 font-semibold text-white hover:bg-slate-700"
              type="submit"
            >
              Entrar a encuesta
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function TeacherPage({ user, onLogout }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [polls, setPolls] = useState([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [selectedResults, setSelectedResults] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadPolls() {
    const response = await api.get("/polls");
    setPolls(response.data);
  }

  useEffect(() => {
    loadPolls().catch(() => setError("No se pudieron cargar las encuestas."));
  }, []);

  useEffect(() => {
    if (!selectedCode) return undefined;
    const fetchResults = async () => {
      const response = await api.get(`/polls/${selectedCode}/results`);
      setSelectedResults(response.data);
      await loadPolls();
    };
    fetchResults().catch(() => setError("No se pudieron actualizar resultados."));
    const intervalId = setInterval(() => {
      fetchResults().catch(() => setError("No se pudieron actualizar resultados."));
    }, POLLING_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [selectedCode]);

  async function createPoll(event) {
    event.preventDefault();
    const cleanOptions = options
      .map((option) => option.trim())
      .filter(Boolean)
      .slice(0, 4);
    const cleanQuestion = question.trim();

    if (!cleanQuestion) {
      setError("La pregunta es obligatoria.");
      return;
    }
    if (cleanOptions.length < 2) {
      setError("Debes completar al menos 2 opciones para crear la encuesta.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await api.post("/polls", {
        question: cleanQuestion,
        options: cleanOptions,
      });
      setQuestion("");
      setOptions(["", ""]);
      setSelectedCode(response.data.code);
      setSelectedResults(response.data);
      await loadPolls();
    } catch (requestError) {
      if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
        setError("Tu sesión de profesor no es válida. Inicia sesión nuevamente.");
      } else {
        setError(
          requestError?.response?.data?.message ??
            "No se pudo crear la encuesta."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function closePoll(code) {
    await api.patch(`/polls/${code}/close`);
    if (selectedCode === code) {
      const response = await api.get(`/polls/${code}/results`);
      setSelectedResults(response.data);
    }
    await loadPolls();
  }

  async function deletePoll(code) {
    await api.delete(`/polls/${code}`);
    await loadPolls();
    if (selectedCode === code) {
      setSelectedCode("");
      setSelectedResults(null);
    }
  }

  const shareLink = useMemo(() => {
    if (!selectedCode) return "";
    return `${window.location.origin}/poll/${selectedCode}`;
  }, [selectedCode]);
  const validOptionsCount = options
    .map((option) => option.trim())
    .filter(Boolean).length;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link className="text-sm text-blue-700 hover:underline" to="/">
          ← Volver al inicio
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-100 px-3 py-1 text-sm">
            {user?.name} (Profesor)
          </span>
          <button
            className="rounded bg-slate-900 px-3 py-1 text-sm text-white"
            onClick={onLogout}
            type="button"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow">
          <h2 className="text-xl font-bold text-slate-800">Crear encuesta</h2>
          <form className="mt-4 space-y-3" onSubmit={createPoll}>
            <input
              className="w-full rounded border border-slate-300 p-2"
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Pregunta de la encuesta"
              value={question}
            />
            {options.map((value, index) => (
              <div className="flex gap-2" key={index}>
                <input
                  className="w-full rounded border border-slate-300 p-2"
                  onChange={(event) => {
                    const updated = [...options];
                    updated[index] = event.target.value;
                    setOptions(updated);
                  }}
                  placeholder={`Opción ${index + 1}`}
                  value={value}
                />
                <button
                  className="rounded border border-red-300 px-3 text-sm text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={options.length <= 2}
                  onClick={() =>
                    setOptions((current) => current.filter((_, idx) => idx !== index))
                  }
                  type="button"
                >
                  Quitar
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <button
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                disabled={options.length >= 4}
                onClick={() => setOptions((current) => [...current, ""])}
                type="button"
              >
                + Agregar opción
              </button>
              <button
                className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-blue-300"
                disabled={loading || !question.trim() || validOptionsCount < 2}
                type="submit"
              >
                {loading ? "Creando..." : "Crear encuesta"}
              </button>
            </div>
            <p className="text-xs text-slate-500">Mínimo 2 opciones, máximo 4.</p>
          </form>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </section>

        <section className="rounded-xl bg-white p-5 shadow">
          <h2 className="text-xl font-bold text-slate-800">Mis encuestas</h2>
          <div className="mt-4 space-y-3">
            {polls.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no hay encuestas.</p>
            ) : (
              polls.map((poll) => (
                <div className="rounded-lg border p-3" key={poll.id}>
                  <p className="font-semibold text-slate-800">{poll.question}</p>
                  <p className="text-sm text-slate-600">
                    Código: <span className="font-mono font-semibold">{poll.code}</span> · Votos:{" "}
                    {poll.totalVotes} · Estado: {poll.isClosed ? "Cerrada" : "Abierta"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      className="rounded bg-slate-800 px-3 py-1 text-xs font-medium text-white"
                      onClick={() => setSelectedCode(poll.code)}
                      type="button"
                    >
                      Ver resultados
                    </button>
                    <button
                      className="rounded border px-3 py-1 text-xs"
                      disabled={poll.isClosed}
                      onClick={() => closePoll(poll.code)}
                      type="button"
                    >
                      Cerrar
                    </button>
                    <button
                      className="rounded border border-red-600 px-3 py-1 text-xs text-red-700"
                      onClick={() => deletePoll(poll.code)}
                      type="button"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {selectedResults ? (
        <section className="mt-6 rounded-xl bg-white p-5 shadow">
          <h3 className="text-lg font-bold text-slate-800">
            Resultados: {selectedResults.question}
          </h3>
          <p className="mb-2 mt-1 text-sm text-slate-600">
            Código: <span className="font-mono">{selectedResults.code}</span> · Total votos:{" "}
            {selectedResults.totalVotes}
          </p>
          <div className="mb-4 text-sm">
            <p className="font-medium text-slate-700">Enlace para votador:</p>
            <a className="break-all text-blue-700 underline" href={shareLink}>
              {shareLink}
            </a>
          </div>
          <ResultsChart results={selectedResults} />
        </section>
      ) : null}
    </main>
  );
}

function StudentPage({ user }) {
  const { code } = useParams();
  const normalizedCode = (code ?? "").toUpperCase();
  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState(null);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [error, setError] = useState("");
  const [loadingVote, setLoadingVote] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      const requests = [
        api.get(`/polls/${normalizedCode}`),
        api.get(`/polls/${normalizedCode}/results`),
      ];
      if (user?.role === "student") {
        requests.push(api.get(`/polls/${normalizedCode}/my-vote`));
      }

      const responses = await Promise.all(requests);
      if (!isMounted) return;
      const pollResponse = responses[0];
      const resultsResponse = responses[1];
      setPoll(pollResponse.data);
      setResults(resultsResponse.data);
      if (responses[2]) {
        setHasVoted(Boolean(responses[2].data.hasVoted));
      }
    };

    fetchData().catch(() => setError("No se pudo cargar la encuesta."));
    const intervalId = setInterval(() => {
      fetchData().catch(() => setError("No se pudo actualizar resultados."));
    }, POLLING_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [normalizedCode, user?.role]);

  async function submitVote(event) {
    event.preventDefault();
    if (!selectedOptionId) return;
    setLoadingVote(true);
    setError("");

    try {
      const response = await api.post(`/polls/${normalizedCode}/votes`, {
        optionId: selectedOptionId,
      });
      setResults(response.data);
      setHasVoted(true);
    } catch (requestError) {
      if (requestError?.response?.status === 409) {
        setHasVoted(true);
      }
      setError(requestError?.response?.data?.message ?? "No se pudo registrar el voto.");
    } finally {
      setLoadingVote(false);
    }
  }

  if (!poll) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-xl p-4 sm:p-8">
        <Link className="text-sm text-blue-700 hover:underline" to="/">
          ← Volver al inicio
        </Link>
        <div className="mt-4 rounded-xl bg-white p-6 shadow">
          <p className="text-slate-700">{error || "Cargando encuesta..."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl p-4 sm:p-8">
      <div className="flex items-center justify-between gap-2">
        <Link className="text-sm text-blue-700 hover:underline" to="/">
          ← Volver al inicio
        </Link>
        {!user ? (
          <Link className="rounded bg-slate-900 px-3 py-1 text-sm text-white" to="/auth">
            Login
          </Link>
        ) : null}
      </div>
      <section className="mt-3 rounded-xl bg-white p-5 shadow">
        <h1 className="text-2xl font-bold text-slate-800">{poll.question}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Código: <span className="font-mono">{poll.code}</span> · Estado:{" "}
          {poll.isClosed ? "Cerrada" : "Abierta"}
        </p>

        {user?.role !== "student" ? (
          <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Para votar, inicia sesión con una cuenta de estudiante.
          </p>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={submitVote}>
            {poll.options.map((option) => (
              <label className="flex items-center gap-2 rounded border p-3" key={option.id}>
                <input
                  checked={selectedOptionId === option.id}
                  disabled={hasVoted || poll.isClosed}
                  name="option"
                  onChange={() => setSelectedOptionId(option.id)}
                  type="radio"
                />
                <span>{option.text}</span>
              </label>
            ))}
            <button
              className="w-full rounded bg-blue-600 p-2 font-semibold text-white disabled:bg-blue-300"
              disabled={loadingVote || hasVoted || poll.isClosed}
              type="submit"
            >
              {hasVoted ? "Ya votaste" : loadingVote ? "Enviando..." : "Enviar voto"}
            </button>
          </form>
        )}

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      {results ? (
        <section className="mt-4 rounded-xl bg-white p-5 shadow">
          <h2 className="text-lg font-bold text-slate-800">
            Resultados en vivo ({results.totalVotes} votos)
          </h2>
          <div className="mt-4">
            <ResultsChart results={results} />
          </div>
        </section>
      ) : null}
    </main>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      setAuthReady(true);
      return;
    }
    api
      .get("/auth/me")
      .then((response) => setUser(response.data.user))
      .catch(() => {
        setAuthToken("");
        setUser(null);
      })
      .finally(() => setAuthReady(true));
  }, []);

  function handleAuth(userPayload, token) {
    setAuthToken(token);
    setUser(userPayload);
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } finally {
      setAuthToken("");
      setUser(null);
    }
  }

  if (!authReady) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl p-4 sm:p-8">
        <div className="rounded-xl bg-white p-6 shadow">
          <p className="text-slate-700">Cargando...</p>
        </div>
      </main>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<LandingPage onLogout={handleLogout} user={user} />} path="/" />
        <Route element={<AuthPage onAuth={handleAuth} />} path="/auth" />
        <Route
          element={
            user?.role === "teacher" ? (
              <TeacherPage onLogout={handleLogout} user={user} />
            ) : (
              <Navigate replace to="/auth" />
            )
          }
          path="/teacher"
        />
        <Route element={<StudentPage user={user} />} path="/poll/:code" />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
