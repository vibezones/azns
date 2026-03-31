const activeServerEl = document.getElementById("activeServer");
const customServerInput = document.getElementById("customServerInput");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");

async function loadStatus() {
  chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
    if (!response) return;

    activeServerEl.textContent = response.activeServer;
    customServerInput.value = response.customServer || "";

    if (response.customServer) {
      clearBtn.classList.add("show");
    } else {
      clearBtn.classList.remove("show");
    }
  });
}

saveBtn.addEventListener("click", async () => {
  const url = customServerInput.value.trim();
  if (!url) {
    alert("Please enter a server URL");
    return;
  }

  chrome.runtime.sendMessage(
    { action: "setCustomServer", url },
    (response) => {
      if (response?.ok) {
        alert("Custom server saved!");
        loadStatus();
      }
    }
  );
});

clearBtn.addEventListener("click", async () => {
  chrome.runtime.sendMessage({ action: "clearCustomServer" }, (response) => {
    if (response?.ok) {
      alert("Custom server cleared!");
      customServerInput.value = "";
      clearBtn.classList.remove("show");
      loadStatus();
    }
  });
});

loadStatus();
