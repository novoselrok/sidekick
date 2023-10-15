function getURLPath(url) {
  let path = new URL(url).pathname.slice(1);
  if (path.endsWith(".html")) {
    return path.slice(0, -5);
  }
  return path;
}

function renderReferences(references) {
  const list = references
    .map(
      (reference) =>
        `<li><a href="${reference.path}">${reference.title} (${getURLPath(
          reference.path
        )})</a></li>`
    )
    .join("");
  return `<h3>References</h3><ul>${list}</ul>`;
}

function onLoad() {
  const input = document.querySelector(".query-input");
  const submitButton = document.querySelector(".submit-button");
  const answerSection = document.querySelector(".answer");
  const answerReferences = document.querySelector(".answer-references");
  const answerSkeleton = document.querySelector(".answer-skeleton");
  const answerContent = document.querySelector(".answer-content");

  const onSubmit = async () => {
    answerSection.style.display = "block";
    answerSkeleton.style.display = "block";
    answerContent.innerText = "";
    answerReferences.innerHTML = "";

    const response = await fetch("/sidekick/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: input.value }),
    }).then((response) => response.json());

    answerSkeleton.style.display = "none";
    answerContent.innerText = response.answer;
    answerReferences.innerHTML = renderReferences(response.references);
  };

  submitButton.addEventListener("click", onSubmit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      onSubmit();
    }
  });
}

document.addEventListener("DOMContentLoaded", onLoad);
