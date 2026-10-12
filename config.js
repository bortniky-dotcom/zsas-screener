(function () {
  var T = ["I feel more nervous and anxious than usual.","I feel afraid for no reason at all.","I get upset easily or feel panicky.","I feel like I'm falling apart and going to pieces.","I feel that everything is all right and nothing bad will happen.","My arms and legs shake and tremble.","I am bothered by headaches, neck and back pains.","I feel weak and get tired easily.","I feel calm and can sit still easily.","I can feel my heart beating fast.","I am bothered by dizzy spells.","I have fainting spells or feel faint.","I can breathe in and out easily.","I get feelings of numbness and tingling in my fingers and toes.","I am bothered by stomachaches or indigestion.","I have to empty my bladder often.","My hands are usually dry and warm.","My face gets hot and blushes.","I fall asleep easily and get a good night's rest.","I have nightmares."];
  var REV = [5, 9, 13, 17, 19];
  var L = ["None or a little of the time", "Some of the time", "Good part of the time", "Most or all of the time"];
  function opts(n) { var r = REV.indexOf(n) >= 0; return L.map(function (l, i) { return { v: r ? 4 - i : i + 1, l: l }; }); }
  window.CFG = {
    slug: "zsas", short: "ZSAS", sub: "Zung Self-rating Anxiety Scale",
    intro: "Listed below are 20 statements. Please read each one carefully and decide how much the statement describes how you have been feeling during the past week.",
    sections: [{ id: "s1", title: "During the past week", items: T.map(function (t, i) { return { id: "q" + (i + 1), num: (i + 1) + ".", text: t, opts: opts(i + 1) }; }) }],
    scoringHint: '<p class="hint">Each item scores 1 to 4 (items 5, 9, 13, 17 and 19 are reverse scored, 4 to 1). Score Total = sum of all 20 items (20 to 80). All statements must be answered. A Score Total of 36 and over suggests the need for further medical assessment of GAD. Score is for healthcare provider interpretation.</p>',
    footer: "ZSAS · Adapted from Zung WWK, Psychosomatics 1971 · screening only, not diagnostic",
    score: function (A, H) {
      var ids = H.ids("q", 1, 20), t = H.sum(A, ids);
      return { incomplete: t === null, rows: [["Score Total (20-80)", t === null ? "Incomplete, not scored" : t], ["Interpretation", t === null ? "Incomplete, not scored" : (t >= 36 ? "36 and over: suggests the need for further medical assessment of GAD" : "Below 36")]] };
    }
  };
})();
