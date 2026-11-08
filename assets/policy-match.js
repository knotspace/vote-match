/* 公約データに基づく限定的な政党比較。未確認の項目は推測しない。 */
(async function () {
  try {
    const state = JSON.parse(localStorage.getItem("votemap2026") || "null");
    if (!state || state.mode !== "party" || !Array.isArray(state.active)) return;

    const notice = document.querySelector(".notice");
    const heading = document.getElementById("matchHeading");
    const answersBox = document.getElementById("answers");
    const response = await fetch("./data/policy-matches.json", { cache: "no-store" });
    if (!response.ok) throw new Error("政策データを読み込めませんでした");
    const data = await response.json();

    if (notice) {
      notice.replaceChildren();
      const strong = document.createElement("strong");
      strong.textContent = "公約を確認できた6設問で参考比較できます";
      const p = document.createElement("p");
      p.className = "muted";
      p.style.margin = "6px 0 0";
      p.textContent = "政党がこのサイトの設問に回答した公式アンケートではありません。2026年衆院選の公約を選択肢に対応づけた参考一致度です。根拠を確認できない政策は計算から除外します。";
      notice.append(strong, p);
    }
    if (heading) heading.textContent = "政党の公約との参考一致度";

    const mappedIds = new Set(Object.keys(data.questions));
    const answeredMapped = [...mappedIds].filter(id =>
      state.active.includes(Number(id)) &&
      Number.isInteger(state.answers?.[id]) &&
      state.answers[id] >= 0 &&
      state.answers[id] < 4
    );

    const scoreRows = data.parties.map(party => {
      let matched = 0;
      let total = 0;
      for (const questionId of answeredMapped) {
        const mapping = data.questions[questionId]?.mappings?.[party.id];
        if (!mapping || !Number.isInteger(mapping.choice)) continue;
        total++;
        if (state.answers[questionId] === mapping.choice) matched++;
      }
      return { ...party, matched, total, score: total ? Math.round(matched / total * 100) : null };
    }).sort((a, b) => {
      if (a.score === null && b.score !== null) return 1;
      if (a.score !== null && b.score === null) return -1;
      return (b.score ?? -1) - (a.score ?? -1) || b.total - a.total || a.name.localeCompare(b.name, "ja");
    });

    const scoreSection = document.createElement("section");
    scoreSection.className = "card";
    scoreSection.style.marginTop = "14px";
    const intro = document.createElement("p");
    intro.className = "muted";
    intro.textContent = "一致率＝選択肢上で一致した公約項目 ÷ 比較可能な回答済み項目。比較できた設問が少ない場合、割合は大きく変動します。";
    scoreSection.append(intro);

    if (!answeredMapped.length) {
      const p = document.createElement("p");
      p.textContent = "公約比較の対象となる設問（消費税・外国人政策・企業団体献金・教育費・夫婦別姓・憲法改正）に回答すると、参考一致度を表示できます。";
      scoreSection.append(p);
    }

    scoreRows.forEach((party, index) => {
      const row = document.createElement("div");
      row.className = "result-row";
      const top = document.createElement("div");
      top.className = "row";
      const name = document.createElement("strong");
      name.textContent = (index + 1) + ". " + party.name;
      const pct = document.createElement("strong");
      pct.style.fontSize = "22px";
      pct.textContent = party.score === null ? "未比較" : party.score + "%";
      top.append(name, pct);

      const small = document.createElement("p");
      small.className = "muted";
      small.textContent = party.total
        ? party.matched + " / " + party.total + "問一致（比較対象 " + party.total + "問）"
        : "今回回答した設問について、比較可能な公約データがありません";

      row.append(top, small);
      if (party.score !== null) {
        const track = document.createElement("div");
        track.style.cssText = "height:7px;background:#e7eaed;margin:8px 0";
        const fill = document.createElement("div");
        fill.style.cssText = "height:7px;background:#0757a6;width:" + party.score + "%";
        track.append(fill);
        row.append(track);
      }
      const source = document.createElement("a");
      source.href = party.official;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.textContent = "政党の公式公約を確認 ↗";
      source.style.fontSize = "13px";
      row.append(source);
      scoreSection.append(row);
    });

    const limitations = document.createElement("details");
    limitations.style.cssText = "margin-top:16px;border-top:1px solid #d7dce1;padding-top:12px";
    const summary = document.createElement("summary");
    summary.textContent = "一致率の注意点・計算方法";
    const list = document.createElement("ul");
    list.className = "muted";
    (data.limitations || []).forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      list.append(li);
    });
    limitations.append(summary, list);
    scoreSection.append(limitations);

    const sourceNote = document.createElement("p");
    sourceNote.className = "muted";
    sourceNote.style.marginBottom = "0";
    sourceNote.textContent = "政策ごとの出典・資料名は、下の「各党の公約内容を確認」から確認できます。各党の公式資料へのリンクも併記しています。";
    scoreSection.append(sourceNote);

    const matchCard = document.querySelector("#matchHeading + section");
    if (matchCard) matchCard.replaceWith(scoreSection);

    // 回答一覧に設問ごとの公約根拠と照合結果を追加する。
    answersBox.querySelectorAll(".result-row").forEach((article, position) => {
      const questionId = String(state.active[position]);
      if (questionId === "undefined") return;
      const questionData = data.questions[questionId];
      if (!questionData) continue;

      const compare = article.querySelector("p.muted");
      if (compare) {
        const count = Object.values(questionData.mappings || {}).filter(Boolean).length;
        compare.textContent = "公約比較データあり：" + count + "政党。";
      }

      const detail = document.createElement("details");
      detail.style.marginTop = "8px";
      const sum = document.createElement("summary");
      sum.textContent = "各党の公約内容・出典を確認";
      const sourceLine = document.createElement("p");
      sourceLine.className = "muted";
      sourceLine.textContent = questionData.sourceLabel || "参照資料";
      const sourceLink = document.createElement("a");
      sourceLink.href = questionData.source;
      sourceLink.target = "_blank";
      sourceLink.rel = "noopener noreferrer";
      sourceLink.textContent = "比較資料を開く ↗";
      const list = document.createElement("ul");
      list.className = "muted";

      data.parties.forEach(party => {
        const mapping = questionData.mappings?.[party.id];
        if (!mapping) return;
        const li = document.createElement("li");
        const userAnswer = state.answers?.[questionId];
        const status = userAnswer === undefined
          ? "あなたは未回答"
          : userAnswer >= 4
            ? "中立・回答しないため計算対象外"
            : userAnswer === mapping.choice
              ? "選択肢上は一致"
              : "選択肢上は不一致";
        li.textContent = party.name + "：" + mapping.summary + "（" + status + "）";
        list.append(li);
      });

      detail.append(sum, sourceLine, sourceLink, list);
      article.append(detail);
    });
  } catch (error) {
    const notice = document.querySelector(".notice");
    if (notice) notice.textContent = "政策比較データを読み込めませんでした。回答内容は保存されています。時間をおいて再読み込みしてください。";
    console.error(error);
  }
})();