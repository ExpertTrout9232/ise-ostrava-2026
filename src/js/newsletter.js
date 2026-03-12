/**
 * Keep Me Updated – newsletter subscription
 *
 * Sends the subscriber's email address to the REST API endpoint.
 * Endpoint: POST /api/newsletter
 * Request body: { "email": "<address>" }
 * Expected success response: HTTP 2xx with JSON { "message": "<string>" }
 *
 * NOTE: This is a planned feature. The backend endpoint does not exist yet.
 * Replace API_ENDPOINT with the real URL once the backend is ready.
 * If the endpoint lives on a different origin, remember to update the
 * Content-Security-Policy `connect-src` directive in every HTML file.
 */

const API_ENDPOINT = "/api/newsletter";

/**
 * Set to `true` once the backend endpoint is live.
 * While `false`, the form shows a "coming soon" notice instead of submitting.
 */
const BACKEND_READY = false;

/**
 * Returns true when the string is a valid e-mail address.
 * Matches the HTML5 `<input type="email">` validity algorithm defined in
 * https://html.spec.whatwg.org/multipage/input.html#email-state-(type=email)
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
    email.trim(),
  );
}

/**
 * Subscribes an e-mail address to the newsletter by calling the REST API.
 * @param {string} email
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function subscribeEmail(email) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });

  let data = {};
  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      // Ignore malformed JSON; fall back to default messages below.
    }
  }

  if (!response.ok) {
    throw new Error(data.message ?? "Subscription failed. Please try again later.");
  }

  return { ok: true, message: data.message ?? "You have been successfully subscribed!" };
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("newsletter-form");
  if (!form) return;

  const emailInput = document.getElementById("newsletter-email");
  const submitBtn = document.getElementById("newsletter-submit");
  const statusMsg = document.getElementById("newsletter-status");

  /**
   * Updates the visible status message.
   * @param {string} text
   * @param {"idle"|"success"|"error"} state
   */
  function setStatus(text, state) {
    statusMsg.textContent = text;
    statusMsg.className = "mt-3 text-[15px]/[24px]";

    if (state === "success") {
      statusMsg.classList.add("text-[#00B497]");
    } else if (state === "error") {
      statusMsg.classList.add("text-red-600");
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!BACKEND_READY) {
      setStatus("Registration signup is coming soon — check back when registration opens!", "idle");
      return;
    }

    const email = emailInput.value;

    if (!isValidEmail(email)) {
      setStatus("Please enter a valid email address.", "error");
      emailInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
    setStatus("", "idle");

    try {
      const result = await subscribeEmail(email);
      setStatus(result.message, "success");
      emailInput.value = "";
    } catch (err) {
      setStatus(err.message, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Keep Me Updated";
    }
  });
});
