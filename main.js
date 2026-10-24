// Frontend demo: the form builds an object that can be sent to an API later.
const formData = {
  name: "", email: "", phone: "",
  plan: { name: "", type: "", price: 0 },
  addons: [], total: 0,
};

const steps = [...document.querySelectorAll(".form__step")];
const indicators = [...document.querySelectorAll(".steps__item")];
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const navigation = document.querySelector(".form__buttons");
const billingToggle = document.getElementById("billingToggle");
const planRadios = [...document.querySelectorAll('input[name="plan"]')];
const addonInputs = [...document.querySelectorAll('.form__checkbox-group input[type="checkbox"]')];
const numberFormatter = new Intl.NumberFormat("en-US");
let currentStep = 0;

function formatPrice(value, period, isAddon = false) {
  return `${isAddon ? "+" : ""}₽${numberFormatter.format(value)} / ${period}`;
}
function isYearlyBilling() {
  return billingToggle.getAttribute("aria-pressed") === "true";
}

function showStep(index, moveFocus = false) {
  currentStep = index;
  steps.forEach((step, i) => {
    const active = i === index;
    step.classList.toggle("form__step--active", active);
    step.toggleAttribute("inert", !active);
    step.setAttribute("aria-hidden", String(!active));
  });
  indicators.forEach((item, i) => {
    const active = i === Math.min(index, indicators.length - 1);
    item.classList.toggle("steps__item--active", active);
    item.classList.toggle("steps__item--complete", i < index);
    if (active) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  const complete = index === steps.length - 1;
  navigation.hidden = complete;
  prevBtn.style.visibility = index === 0 ? "hidden" : "visible";
  const confirming = index === steps.length - 2;
  nextBtn.textContent = confirming ? "Confirm subscription" : "Next step";
  nextBtn.classList.toggle("btn--confirm", confirming);
  if (moveFocus) {
    const heading = steps[index].querySelector(".form__title, .thankyou__title");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
    if (window.matchMedia("(max-width: 780px)").matches) {
      document.querySelector(".form-wrapper").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}

function markInvalid(input, invalid) {
  const error = document.getElementById(`error-${input.id}`);
  input.classList.toggle("input-error", invalid);
  input.setAttribute("aria-invalid", String(invalid));
  if (error) {
    error.classList.toggle("form__error--active", invalid);
    if (invalid) input.setAttribute("aria-describedby", error.id);
    else input.removeAttribute("aria-describedby");
  }
}

function isValidField(input) {
  const value = input.value.trim();
  if (input.id === "name") return value.length > 0;
  if (input.id === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (input.id === "phone") {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }
  return true;
}
function validateContact() {
  const fields = ["name", "email", "phone"].map(id => document.getElementById(id));
  let valid = true;
  for (const field of fields) {
    const ok = isValidField(field);
    markInvalid(field, !ok);
    if (!ok) valid = false;
  }
  if (!valid) fields.find(field => !isValidField(field))?.focus();
  if (valid) {
    for (const field of fields) formData[field.id] = field.value.trim();
  }
  return valid;
}
function validatePlan() {
  const valid = planRadios.some(radio => radio.checked);
  const message = document.querySelector(".plan-error");
  message.classList.toggle("plan-error--active", !valid);
  if (!valid) planRadios[0].focus();
  return valid;
}

["name", "email", "phone"].forEach(id => {
  const field = document.getElementById(id);
  field.addEventListener("input", () => {
    if (field.getAttribute("aria-invalid") === "true") markInvalid(field, !isValidField(field));
  });
});
planRadios.forEach(radio => radio.addEventListener("change", () => {
  document.querySelector(".plan-error").classList.remove("plan-error--active");
}));

function updatePrices() {
  const yearly = isYearlyBilling();
  const period = yearly ? "yr" : "mo";
  document.querySelector(".billing-label.monthly").classList.toggle("label-toggled", !yearly);
  document.querySelector(".billing-label.yearly").classList.toggle("label-toggled", yearly);
  billingToggle.setAttribute("aria-label", yearly ? "Pay monthly instead of yearly" : "Pay yearly instead of monthly");
  planRadios.forEach(input => {
    const price = Number(yearly ? input.dataset.yearly : input.dataset.monthly);
    document.getElementById(`price-${input.value}`).textContent = formatPrice(price, period);
    const savings = Number(input.dataset.monthly) * 12 - Number(input.dataset.yearly);
    const note = input.closest(".plan").querySelector(".yearly-plan-discount");
    note.textContent = `Save ₽${numberFormatter.format(savings)} / year`;
    note.classList.toggle("yearly-plan-discount--active", yearly);
  });
  addonInputs.forEach(input => {
    const price = Number(yearly ? input.dataset.yearly : input.dataset.monthly);
    input.closest(".checkbox").querySelector(".checkbox__label-price").textContent = formatPrice(price, period, true);
  });
}
billingToggle.addEventListener("click", () => {
  billingToggle.setAttribute("aria-pressed", String(!isYearlyBilling()));
  updatePrices();
});

function updateSummary() {
  const selected = planRadios.find(radio => radio.checked);
  if (!selected) return;
  const yearly = isYearlyBilling();
  const period = yearly ? "yr" : "mo";
  const planName = selected.closest(".plan").querySelector(".plan__content strong").textContent;
  const planPrice = Number(yearly ? selected.dataset.yearly : selected.dataset.monthly);
  formData.plan = { name: planName, type: yearly ? "yearly" : "monthly", price: planPrice };

  document.getElementById("summary-plan-name").textContent = `${planName} (${yearly ? "Yearly" : "Monthly"})`;
  document.getElementById("summary-plan-price").textContent = formatPrice(planPrice, period);
  const addonsSummary = document.querySelector(".form__summary-addons");
  addonsSummary.replaceChildren();
  formData.addons = addonInputs.filter(input => input.checked).map(input => ({
    title: input.closest(".checkbox").querySelector(".checkbox__label-title").textContent,
    price: Number(yearly ? input.dataset.yearly : input.dataset.monthly),
  }));
  if (formData.addons.length === 0) {
    addonsSummary.textContent = "No add-ons selected";
  } else {
    for (const addon of formData.addons) {
      const row = document.createElement("div");
      row.className = "form__summary-addon";
      const title = document.createElement("span");
      title.textContent = addon.title;
      const price = document.createElement("span");
      price.className = "form__summary-addon-price";
      price.textContent = formatPrice(addon.price, period, true);
      row.append(title, price);
      addonsSummary.append(row);
    }
  }
  formData.total = planPrice + formData.addons.reduce((total, addon) => total + addon.price, 0);
  document.getElementById("summary-total").textContent = formatPrice(formData.total, period);
}
nextBtn.addEventListener("click", () => {
  if (currentStep === 0 && !validateContact()) return;
  if (currentStep === 1 && !validatePlan()) return;
  if (currentStep >= steps.length - 1) return;
  if (currentStep === 2) updateSummary();
  showStep(currentStep + 1, true);
  if (currentStep === steps.length - 1) {
    // Demo only — replace this with a real API request when a backend is available.
    console.info("Subscription ready to submit:", structuredClone(formData));
  }
});
prevBtn.addEventListener("click", () => {
  if (currentStep > 0) showStep(currentStep - 1, true);
});
document.getElementById("summary-change-plan").addEventListener("click", () => showStep(1, true));

updatePrices();
showStep(0);
