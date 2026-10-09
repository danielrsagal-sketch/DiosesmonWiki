// Envía el formulario a FormSubmit (https://formsubmit.co), que lo reenvía por correo.
// La primera vez FormSubmit manda un correo de activación a esta dirección: hay que confirmarlo
// una única vez. Después, FormSubmit da un código aleatorio que puede sustituir al correo aquí
// para no dejarlo visible en la página.
const FEEDBACK_ENDPOINT = "https://formsubmit.co/ajax/danielr.sagal@gmail.com";
const MAX_LENGTH = 2000;
const MIN_MESSAGE = 10;

const form = document.querySelector("#feedback-form");
const nameInput = document.querySelector("#fb-name");
const messageInput = document.querySelector("#fb-message");
const counter = document.querySelector("#fb-count");
const status = document.querySelector("#fb-status");
const submitButton = form.querySelector(".fb-submit");
const done = document.querySelector("#fb-done");

function setError(input, show) {
  input.closest(".fb-field").classList.toggle("is-invalid", show);
  document.querySelector(`[data-error-for="${input.id}"]`).hidden = !show;
  input.setAttribute("aria-invalid", String(show));
}

function validate() {
  const nameOk = nameInput.value.trim().length > 0;
  const messageOk = messageInput.value.trim().length >= MIN_MESSAGE;
  setError(nameInput, !nameOk);
  setError(messageInput, !messageOk);
  if (!nameOk) nameInput.focus();
  else if (!messageOk) messageInput.focus();
  return nameOk && messageOk;
}

messageInput.addEventListener("input", () => {
  counter.textContent = `${messageInput.value.length} / ${MAX_LENGTH}`;
  if (messageInput.value.trim().length >= MIN_MESSAGE) setError(messageInput, false);
});
nameInput.addEventListener("input", () => {
  if (nameInput.value.trim()) setError(nameInput, false);
});

// Traduce la respuesta de FormSubmit para que el motivo real sea visible.
function describeError(error) {
  const message = String(error.message || "");
  if (location.protocol === "file:") return "Abre la página desde un servidor (por ejemplo, python -m http.server); desde un archivo local no se puede enviar.";
  if (/activat/i.test(message)) return "El buzón aún no está activado: revisa el correo del equipo (también Spam) y pulsa «Activate Form» en el mensaje de FormSubmit. Luego vuelve a enviar.";
  if (error.fromService) return `FormSubmit rechazó el mensaje: ${message}`;
  return "No se pudo conectar con el servicio de correo. Revisa tu conexión o desactiva bloqueadores de anuncios para esta página e inténtalo de nuevo.";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "";
  if (!validate()) return;
  if (form.elements._honey.value) return; // Bot: se descarta en silencio.
  const user = nameInput.value.trim();
  const kind = form.elements.tipo.value;
  submitButton.disabled = true;
  submitButton.classList.add("is-sending");
  submitButton.querySelector(".fb-submit-text").textContent = "Enviando…";
  try {
    const response = await fetch(FEEDBACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `[DiosesmonWiki] ${kind} de ${user}`,
        _template: "table",
        _captcha: "false",
        Usuario: user,
        Tipo: kind,
        Mensaje: messageInput.value.trim(),
        Página: location.href,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || String(result.success) === "false") {
      const error = new Error(result.message || `Respuesta ${response.status}`);
      error.fromService = true;
      throw error;
    }
    document.querySelector("#fb-done-name").textContent = user;
    form.hidden = true;
    done.hidden = false;
    done.querySelector("#fb-again").focus();
  } catch (error) {
    console.warn("No se pudo enviar el feedback.", error);
    status.textContent = describeError(error);
  } finally {
    submitButton.disabled = false;
    submitButton.classList.remove("is-sending");
    submitButton.querySelector(".fb-submit-text").textContent = "Lanzar mensaje";
  }
});

document.querySelector("#fb-again").addEventListener("click", () => {
  form.reset();
  counter.textContent = `0 / ${MAX_LENGTH}`;
  done.hidden = true;
  form.hidden = false;
  nameInput.focus();
});
