document.querySelectorAll(".immunity-checkbox").forEach((cb) => {
  cb.addEventListener("change", () => {
    const container = document.getElementById("immunity-details");

    if (cb.checked) {
      const block = document.createElement("div");
      block.className = "immunity-block";
      block.id = "block-" + cb.value;

      block.innerHTML = `
        <h4>${cb.value}</h4>
        <label><input type="radio" name="${cb.value}" value="Full">Повний</label>
        <label><input type="radio" name="${cb.value}" value="Other" class="other-radio">Інше</label>
        <div class="other-input"></div>
      `;
      container.appendChild(block);

      // слухач для всіх radio у цьому блоці
      block.querySelectorAll(`input[name="${cb.value}"]`).forEach((radio) => {
        radio.addEventListener("change", (e) => {
          const otherInputContainer = block.querySelector(".other-input");
          if (e.target.classList.contains("other-radio") && e.target.checked) {
            otherInputContainer.innerHTML = `<input type="text" name="${e.target.name}" placeholder="Введіть значення">`;
          } else {
            otherInputContainer.innerHTML = "";
          }
        });
      });
    } else {
      const block = document.getElementById("block-" + cb.value);
      if (block) block.remove();
    }
  });
});
