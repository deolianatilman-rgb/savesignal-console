(function () {
  "use strict";
  var form = document.getElementById("contactForm");
  var status = document.getElementById("formStatus");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      status.textContent = "Please fill in all fields first.";
      return;
    }
    status.textContent = "Message queued — this prototype has no backend connected yet.";
    form.reset();
  });
})();
