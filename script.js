function showSection(sectionId) {
  document.getElementById("mainMenu").classList.add("hidden");
  document.getElementById(sectionId).classList.remove("hidden");
}

function goBack() {
  document.getElementById("mainMenu").classList.remove("hidden");
  document.getElementById("compareSection").classList.add("hidden");
  document.getElementById("scanSection").classList.add("hidden");
}

// -------------------- FILE READING --------------------
async function readFile(file) {
  if (!file) return "";

  let ext = file.name.split(".").pop().toLowerCase();

  if (ext === "txt") {
    return file.text();
  } else if (ext === "docx") {
    return file.arrayBuffer().then(buffer => {
      return mammoth.extractRawText({ arrayBuffer: buffer })
                   .then(result => result.value);
    });
  } else if (ext === "pdf") {
    return file.arrayBuffer().then(buffer => {
      return pdfjsLib.getDocument({ data: buffer }).promise.then(doc => {
        let textPromises = [];
        for (let i = 1; i <= doc.numPages; i++) {
          textPromises.push(doc.getPage(i).then(page => {
            return page.getTextContent().then(tc =>
              tc.items.map(i => i.str).join(" ")
            );
          }));
        }
        return Promise.all(textPromises).then(pages => pages.join("\n"));
      });
    });
  } else {
    alert("Unsupported file type: " + ext);
    return "";
  }
}

// -------------------- DOCUMENT COMPARISON --------------------
async function compareDocs() {
  const file1 = document.getElementById("file1").files[0];
  const file2 = document.getElementById("file2").files[0];

  if (!file1 || !file2) {
    alert("Please upload two contracts!");
    return;
  }

  let text1 = await readFile(file1);
  let text2 = await readFile(file2);

  let lines1 = text1.split("\n").map(l => l.trim());
  let lines2 = text2.split("\n").map(l => l.trim());

  let maxLen = Math.max(lines1.length, lines2.length);
  let differences = "";
  let diffCount = 0;

  for (let i = 0; i < maxLen; i++) {
    let l1 = lines1[i] || "";
    let l2 = lines2[i] || "";

    if (l1 !== l2) {
      diffCount++;
      differences += `
        <div class="diff-block">
          <strong>Line ${i+1} Difference:</strong><br>
          <span style="color:#c0392b">Contract 1:</span> ${l1 || "(empty)"} <br>
          <span style="color:#27ae60">Contract 2:</span> ${l2 || "(empty)"}
        </div><hr>
      `;
    }
  }

  document.getElementById("summary").innerHTML = diffCount === 0
    ? "✅ No differences found"
    : `⚠️ ${diffCount} differences found`;

  document.getElementById("results").innerHTML = differences || "<p>No differences</p>";
}


// -------------------- KEY POINTS SCAN --------------------
async function extractKeyPoints() {
  const file = document.getElementById("singleFile").files[0];
  if (!file) {
    alert("Please upload a contract first!");
    return;
  }

  let text = await readFile(file);

  // Detect key clauses
  const clauses = ["Payment Terms", "Termination", "Confidentiality", "Profit", "Margin", "Cost", "Price"];
  let clauseResults = "<h4>📌 Key Clauses:</h4><ul>";
  clauses.forEach(clause => {
    if (text.match(new RegExp(clause, "i"))) {
      clauseResults += `<li><strong>${clause}:</strong> Found in document</li>`;
    }
  });
  clauseResults += "</ul>";

  // Extract sentences with numbers, $, %
  let keySentences = text.split(/[\.\n]/).filter(line =>
    /\d|%|\$|profit|margin|agreement|contract|terms|price|cost/i.test(line)
  );

  let html = "<h4>📊 Key Points:</h4><ul>";
  keySentences.forEach(s => {
    if (s.trim()) {
      html += `<li>${s.trim()}</li>`;
    }
  });
  html += "</ul>";

  document.getElementById("keyClauses").innerHTML = clauseResults;
  document.getElementById("keypoints").innerHTML = html || "<p>No key points detected.</p>";
}
async function checkLegal() {
  const file = document.getElementById("legalFile").files[0];
  if (!file) {
    alert("Please upload a document!");
    return;
  }

  let text = await readFile(file);
  let lower = text.toLowerCase();

  // Keywords that typically appear in contracts
  const legalKeywords = [
    "agreement", "party", "clause", "jurisdiction", "liability",
    "confidentiality", "termination", "warranty", "obligations",
    "governing law", "contract", "terms and conditions"
  ];

  const signatureKeywords = ["signed", "signature", "witness", "date"];

  let foundKeywords = legalKeywords.filter(k => lower.includes(k));
  let foundSignatures = signatureKeywords.filter(k => lower.includes(k));

  let resultHtml = "<h4>📌 Legal Check Results:</h4>";

  if (foundKeywords.length > 5) {
    resultHtml += `<p>✅ This document contains multiple legal terms (${foundKeywords.length} found). It looks like a legal contract.</p>`;
  } else {
    resultHtml += `<p>⚠️ Only ${foundKeywords.length} legal terms detected. This may not be a full legal contract.</p>`;
  }

  if (foundSignatures.length > 0) {
    resultHtml += `<p>🖊️ Signature/Date indicators found: ${foundSignatures.join(", ")}</p>`;
  } else {
    resultHtml += `<p>⚠️ No signature/date indicators found. Legal documents usually have them.</p>`;
  }

  resultHtml += "<h4>🔎 Detected Legal Keywords:</h4><ul>";
  foundKeywords.forEach(k => {
    resultHtml += `<li>${k}</li>`;
  });
  resultHtml += "</ul>";

  document.getElementById("legalResults").innerHTML = resultHtml;
}


// -------------------- SEARCH HIGHLIGHT --------------------
function searchKeyword() {
  let term = document.getElementById("searchBox").value.trim();
  let container = document.getElementById("doc1");

  if (!term) {
    container.querySelectorAll(".highlight-search").forEach(el => {
      el.outerHTML = el.innerText;
    });
    return;
  }

  let regex = new RegExp(`(${term})`, "gi");
  container.innerHTML = container.innerHTML.replace(regex, `<span class="highlight-search">$1</span>`);
}

// -------------------- EXPORT REPORT --------------------
function exportReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let summary = document.getElementById("summary")?.innerText || "";
  let results = document.getElementById("doc1")?.innerText || "";
  let keypoints = document.getElementById("keypoints")?.innerText || "";
  let clauses = document.getElementById("keyClauses")?.innerText || "";

  doc.setFontSize(14);
  doc.text("AI Contract Analyser Report", 20, 20);

  if (summary) {
    doc.setFontSize(12);
    doc.text("Summary:", 20, 40);
    doc.text(summary, 30, 50);
  }

  if (results) {
    doc.text("Comparison Results:", 20, 70);
    doc.text(results, 30, 80, { maxWidth: 160 });
  }

  if (clauses || keypoints) {
    doc.text("Extracted Insights:", 20, 120);
    doc.text((clauses + "\n" + keypoints), 30, 130, { maxWidth: 160 });
  }

  doc.save("AI_Contract_Analyser_Report.pdf");
}
function sendMessage() {
  const input = document.getElementById("chatInput");
  const messages = document.getElementById("chatbot-messages");

  if (input.value.trim() === "") return;

  // User message
  const userMsg = document.createElement("div");
  userMsg.textContent = "👤 " + input.value;
  messages.appendChild(userMsg);

 // Bot response (simple rule-based)
  const botMsg = document.createElement("div");
  if (input.value.toLowerCase().includes("compare")) {
    botMsg.textContent = "🤖 You can compare contracts by uploading them in the 'Compare Contracts' section.";
  } else if (input.value.toLowerCase().includes("scan")) {
    botMsg.textContent = "🤖 Use 'Scan Contract' to extract key points like profit, margins, and terms.";
  } else if (input.value.toLowerCase().includes("legal")) {
    botMsg.textContent = "🤖 The 'Legal Check' feature verifies if your document looks like a legal contract.";
  } else {
    botMsg.textContent = "🤖 Sorry, I didn’t understand. Try asking about 'compare', 'scan', or 'legal check'.";
  }
  messages.appendChild(botMsg);

  input.value = "";
  messages.scrollTop = messages.scrollHeight;
}
