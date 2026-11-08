/* 公約データに基づく限定的な政党比較。未確認の項目は推測しない。 */
(async function(){
  if (!s || s.mode !== "party" || !Array.isArray(s.active)) return;
  const notice = document.querySelector(".notice");
  const heading = document.getElementById("matchHeading");
  const answersBox = document.getElementById("answers");
  const response = await fetch("./data/policy-matches.json", {cache:"no-store"});
  if (!response.ok) throw new Error("政策データを読み込めませんでした");
  const data = await response.json();
  if (notice) {
    notice.innerHTML = "";
    const strong = document.createElement("strong");
    strong.textContent = "公約を確認できた2設問で参考比較できます";
    const p = document.createElement("p");
    p.className = "muted";
    p.style.margin = "6px 0 0";
    p.textContent = "政党がこのサイトの設問に回答した公式アンケートではありません。2026年衆院選の公約を選択肢に対応づけた参考一致度です。確認できない政策は計算から除外します。";
    notice.append(strong,p);
  }
  if (heading) heading.textContent = "政党の公約との参考一致度";
  const scoreRows = data.parties.map(party => {
    let matched = 0, total = 0;
    for (const [questionId, question] of Object.entries(data.questions)) {
      const mapping = question.mappings[party.id];
      const userAnswer = s.answers[questionId];
      if (!mapping || userAnswer === undefined || userAnswer === null || userAnswer > 3) continue;
      total++;
      if (userAnswer === mapping.choice) matched++;
    }
    return {...party, matched, total, score: total ? Math.round(matched / total * 100) : null};
  }).filter(p => p.total > 0).sort((a,b) => b.score-a.score || b.total-a.total || a.name.localeCompare(b.name,"ja"));
  const scoreSection = document.createElement("section");
  scoreSection.className = "card";
  scoreSection.style.marginTop = "14px";
  const intro = document.createElement("p");
  intro.className = "muted";
  intro.textContent = "一致率＝一致した公約項目 ÷ 比較可能な回答済み項目。対象が少ないため、順位だけで投票先を判断しないでください。";
  scoreSection.append(intro);
  if (!scoreRows.length) {
    const p = document.createElement("p");
    p.textContent = "比較対象の設問にまだ回答していません。消費税・企業団体献金の質問に回答すると比較できます。";
    scoreSection.append(p);
  }
  scoreRows.forEach((party, i) => {
    const row = document.createElement("div");
    row.className = "result-row";
    const top = document.createElement("div");
    top.className = "row";
    const name = document.createElement("strong");
    name.textContent = (i+1) + ". " + party.name;
    const pct = document.createElement("strong");
    pct.style.fontSize = "22px";
    pct.textContent = party.score + "%";
    top.append(name,pct);
    const small = document.createElement("p");
    small.className = "muted";
    small.textContent = party.matched + " / " + party.total + "問一致（比較対象 " + party.total + "問）";
    const track = document.createElement("div");
    track.style.cssText = "height:7px;background:#e7eaed;margin:8px 0";
    const fill = document.createElement("div");
    fill.style.cssText = "height:7px;background:#0757a6;width:" + party.score + "%";
    track.append(fill);
    const source = document.createElement("a");
    source.href = party.official;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = "政党の公式公約を確認 ↗";
    source.style.fontSize = "13px";
    row.append(top,small,track,source);
    scoreSection.append(row);
  });
  const limitations = document.createElement("details");
  limitations.style.cssText = "margin-top:16px;border-top:1px solid #d7dce1;padding-top:12px";
  const summary = document.createElement("summary");
  summary.textContent = "一致率の注意点・計算方法";
  const list = document.createElement("ul");
  list.className = "muted";
  data.limitations.forEach(item => { const li=document.createElement("li"); li.textContent=item; list.append(li); });
  limitations.append(summary,list);
  scoreSection.append(limitations);
  const sourceNote = document.createElement("p");
  sourceNote.className = "muted";
  sourceNote.style.marginBottom = "0";
  sourceNote.textContent = "公約の横断整理：テレビ朝日「経済・物価高対策」「政治とカネ」（2026年2月3日）。各党の公式公約リンクも併記しています。";
  scoreSection.append(sourceNote);
  const matchCard = document.querySelector("#matchHeading + section");
  if (matchCard) matchCard.replaceWith(scoreSection);
  for (const article of answersBox.querySelectorAll(".result-row")) {
    const indexText = article.querySelector("p strong")?.textContent || "";
    const questionIndex = s.active.find((n,j) => (j+1) + ". " + qs[n].q === indexText);
    if (questionIndex === undefined) continue;
    const qid = String(s.active[questionIndex]);
    const questionData = data.questions[qid];
    const compare = article.querySelector("p.muted");
    if (!compare || !questionData) continue;
    compare.textContent = "公約比較データあり：" + Object.values(questionData.mappings).filter(Boolean).length + "政党。";
    const detail = document.createElement("details");
    detail.style.marginTop = "8px";
    const sum = document.createElement("summary");
    sum.textContent = "各党の公約内容を確認";
    const list = document.createElement("ul");
    list.className = "muted";
    data.parties.forEach(party => {
      const mapping = questionData.mappings[party.id];
      if (!mapping) return;
      const li = document.createElement("li");
      const status = s.answers[qid] === undefined ? "あなたは未回答" : s.answers[qid] > 3 ? "一致率の計算対象外" : s.answers[qid] === mapping.choice ? "選択肢上は一致" : "選択肢上は不一致";
      li.textContent = party.name + "： " + mapping.summary + "（" + status + "）";
      list.append(li);
    });
    detail.append(sum,list);
    article.append(detail);
  }
})().catch(error => {
  const notice = document.querySelector(".notice");
  if (notice) notice.textContent = "政策比較データを読み込めませんでした。回答内容は保存されています。時間をおいて再読み込みしてください。";
  console.error(error);
});
