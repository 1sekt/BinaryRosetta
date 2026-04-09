let currentAttr = 'light'; 
let hasRosetta = false; 
let currentStageData = null; // 必ず最初に定義する
let isFactionLocked = false; // 属性選択済みフラグ
// 全チャプターの回答を保存する巨大な箱 (ChapterID -> {WordID: Text})
let allChapterAnswers = {}; 
// 現在表示中のチャプターの回答
let stageDecodes = {}; // 入力内容を保存するオブジェクト（グローバル等で定義）
let maxUnlockedStage = 0;      // 未来（1→10）の解放状況
let maxReversedStage = 10;     // 過去（10→1）の解放状況（初期値10）
let showHints = false; // ヒント表示フラグ

function startGame() {
    const title = document.getElementById('title-screen');
    const content = document.getElementById('game-content');
    
    // スライドアウト演出
    title.style.transform = "translateY(-100%)";
    title.style.opacity = "0";
    
    setTimeout(() => {
        title.style.display = 'none';
        content.style.display = 'flex';
        loadStage(0); 
    }, 800);
}

// 1. ステージデータの取得
async function loadStage(id) {
    // ロゼッタ使用中か否かでロック判定を切り替える
    if (hasRosetta) {
        if (id < maxReversedStage) {
            alert("この時代の解釈を完了させるまで、遡ることはできない。");
            return;
        }
    } else {
        if (id > maxUnlockedStage) {
            alert("前のチャプターの解釈を完了させてください。");
            return;
        }
    }

    try {
        const response = await fetch(`/api/stage/${id}`);
        currentStageData = await response.json();
        stageDecodes = allChapterAnswers[id] || {};
        
        const container = document.getElementById('story-container');
        if (container) container.scrollTop = 0;

        updateStageListUI();
        renderGame();
    } catch (error) {
        console.error("ロード失敗", error);
    }
}




function renderGame() {
    const board = document.getElementById('game-board');
    const prologueEl = document.getElementById('story-prologue');
    const epilogueEl = document.getElementById('story-epilogue');
    
    if (!board) return;
    board.innerHTML = ''; 

    if (!currentStageData || !currentStageData.words) return;

    // 地の文の表示（一文一行）
    renderStoryText();

    // ドット絵エリアの生成
    currentStageData.words.forEach((word) => {
        const container = document.createElement('div');
        container.className = 'word-container';

        let displayText = hasRosetta ? word.trueSide.text : 
                         (currentAttr === 'light' ? word.light.text : word.dark.text);

        const titleMatch = displayText.match(/「.*?」/);
        const subtextContentMatch = displayText.match(/[（\()](.*?)[）\)]/);
        const titleString = titleMatch ? titleMatch[0] : displayText;
        
        let subString = "";
        if (subtextContentMatch && subtextContentMatch[1]) {
            subString = `（意味：${subtextContentMatch[1]}）`;
        }

        const titleEl = document.createElement('div');
        titleEl.className = 'main-title';
        titleEl.innerText = titleString;

        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, 100, 100);
        drawPattern(ctx, word.pattern, word.size, 100);

        const subEl = document.createElement('div');
        subEl.className = 'sub-text';
        subEl.innerText = subString;
        if (showHints) subEl.classList.add('show');

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'decode-input';
        input.placeholder = "解釈を入力...";
        input.value = stageDecodes[word.id] || "";

        input.addEventListener('input', (e) => {
            stageDecodes[word.id] = e.target.value;
            allChapterAnswers[currentStageData.id] = { ...stageDecodes };
            renderStoryText(); // 地の文へリアルタイム反映
            checkStageProgress();
        });

        container.appendChild(titleEl);
        container.appendChild(canvas);
        container.appendChild(subEl);
        container.appendChild(input);
        board.appendChild(container);
    });

    checkStageProgress();
}
	
	// 3. 属性を選択して確定する関数
	// 属性を最初に選択する関数
//	function selectInitialFaction(faction) {
//	    currentAttr = faction;
//	    isFactionLocked = true; // 選択したらロック
//	    updateVisualMode();
//	    
//	    // 選択肢を消して再描画
//	    document.getElementById('faction-selector').style.display = 'none';
//	    renderGame();
//	    
//	    alert(`${faction === 'light' ? '光' : '闇'}の民としての運命が刻まれました。`);
//	}
//
//    // 進行状況のチェック（「次へ」ボタンの表示判断）
//    checkStageProgress();
//}





// リストの鍵かけ状態を更新する
function updateStageListUI() {
    const stageItems = document.querySelectorAll('#stage-list li');
    stageItems.forEach((li) => {
        const onclickValue = li.getAttribute('onclick');
        if (!onclickValue) return;
        const stageId = parseInt(onclickValue.match(/\d+/));

        let isLocked = false;
        if (hasRosetta) {
            // ロゼッタ時：現在の到達地点より小さいID（さらに過去）はロック
			// ロゼッタ時：0章まで遡れるように判定を変更
			isLocked = (stageId < 0 || stageId > 10 || stageId < maxReversedStage);
        } else {
            // 通常時：現在の到達地点より大きいID（未来）はロック
            isLocked = (stageId > maxUnlockedStage);
        }

        if (isLocked) {
            li.classList.add('locked');
        } else {
            li.classList.remove('locked');
        }

        if (currentStageData && stageId === currentStageData.id) {
            li.classList.add('active');
        } else {
            li.classList.remove('active');
        }
    });
}


// ステージクリア時の処理
// 「先へ進む」ボタンが押された時の処理

async function proceedToNextStage() {
    const currentId = currentStageData.id;
    
    // 1. 現在の入力を確実に保存
    allChapterAnswers[currentId] = { ...stageDecodes };

    if (hasRosetta) {
        // --- 過去へ遡る処理 (10 -> 0) ---
        const nextId = currentId - 1;
        
        if (currentId <= maxReversedStage) {
            maxReversedStage = nextId;
        }

        if (nextId >= 0) {
            updateStageListUI();
            loadStage(nextId);
        } else {
            alert("全ての時間を遡り、真の始まりへと辿り着いた。\n物語は、貴方の手で書き換えられた。");
        }
    } else {
        // --- 通常の未来へ進む処理 (0 -> 10) ---

        // ★Chapter 00：入力された言葉で属性（運命）を確定させる
        if (currentId === 0 && !isFactionLocked) {
            // w0-1 の入力内容を取得（大文字小文字や空白をトリム）
            const answer0 = (stageDecodes['w0-1'] || "").trim();
            
            if (answer0 === "誕生") {
                currentAttr = 'light';
                isFactionLocked = true;
                alert("「誕生」――其は光の始まり。\n貴方の運命は『光の民』として刻まれました。");
            } else if (answer0 === "埋葬") {
                currentAttr = 'dark';
                isFactionLocked = true;
                alert("「埋葬」――其は闇の安らぎ。\n貴方の運命は『闇の民』として刻まれました。");
            } else {
                // 想定外の言葉が入った場合（デフォルトで光にするか、警告を出すか）
                currentAttr = 'light'; 
                isFactionLocked = true;
                alert("その言葉は、光の系譜として解釈されました。");
            }
            updateVisualMode(); // 画面の色を白 or 紫に更新
        }

        const nextId = currentId + 1;

        // 10章をクリアした瞬間の処理
        if (currentId === 10) {
            unlockRosettaStone();
            updateStageListUI(); 
            return; 
        }

        // 通常の進行
        if (currentId >= maxUnlockedStage) {
            maxUnlockedStage = nextId;
        }

        if (nextId <= 10) {
            updateStageListUI();
            loadStage(nextId);
        }
    }
}




// ロゼッタ石のロック解除演出
function unlockRosettaStone() {
    const rosettaBtn = document.getElementById('rosetta-btn');
    if (rosettaBtn && rosettaBtn.disabled) {
        rosettaBtn.disabled = false;
        rosettaBtn.innerText = "ロゼッタストーン";
        rosettaBtn.classList.add('unlocked-flash');

        // ボタンの描画を待ってから通知を出す
        setTimeout(() => {
            alert("Chapter 10 の解読を完了した。\n石碑の深層から、真実を映す『ロゼッタストーン』が浮上した。");
        }, 150);
    }
}



function checkStageProgress() {
    const allInputs = document.querySelectorAll('.decode-input');
    const filledInputs = Array.from(allInputs).filter(i => i.value.trim() !== "");
    const epilogue = document.getElementById('story-epilogue');
    let nextBtn = document.getElementById('next-stage-btn');

    if (allInputs.length > 0 && filledInputs.length === allInputs.length) {
        if (!nextBtn) {
            nextBtn = document.createElement('button');
            nextBtn.id = 'next-stage-btn';
            nextBtn.innerText = "――この解釈で先へ進む";
            nextBtn.onclick = () => proceedToNextStage(); // 直接 loadStage を呼ばず、解放処理を通す
            epilogue.after(nextBtn);
        }
    } else if (nextBtn) {
        nextBtn.remove();
    }
}


async function updateBalanceUI() {
    try {
        const response = await fetch('/api/player/world-status');
        const status = await response.json();
        
        const indicator = document.getElementById('balance-indicator');
        const diff = status.diff; // Java側で計算した差分
        const bias = status.bias; // 'light', 'dark', or 'none'

        // 中央(50%)を基準に、差分1につき5%動かす（最大50%移動）
        let position = 50;
        if (bias === 'light') position += (diff * 5);
        if (bias === 'dark') position -= (diff * 5);

        // 範囲制限（0%〜100%）
        position = Math.max(0, Math.min(100, position));
        indicator.style.left = position + "%";

        // 偏り（5以上）による色の変化
        if (diff >= 5) {
            indicator.style.background = (bias === 'light') ? "#fff" : "#444";
            indicator.style.boxShadow = (bias === 'light') ? "0 0 15px #fff" : "0 0 15px #f00";
        } else {
            indicator.style.background = "#888"; // 均衡状態
            indicator.style.boxShadow = "none";
        }
    } catch (e) {
        console.error("ゲージの更新に失敗", e);
    }
}




// 3. 単語1つの描画ロジック（上下・左右の価値観を反映）
function drawPattern(ctx, pattern, size, displaySize) {
    const cellSize = displaySize / size;
    const splitPoint = Math.floor(size * 0.4); 

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const val = pattern[row][col];
            let color = "transparent";
            let visible = false;

            if (hasRosetta) {
                // ロゼッタ：純白と明るいグレーの共存
                color = (val === 1) ? "#FFFFFF" : "#AAAAAA"; 
                visible = true;
            } else if (currentAttr === 'light') {
                // 光の民：1(白)のみ表示
                if (val === 1) {
                    // 上位：純白 / 下位：明るめのグレー（#BBBBBB）
                    // これで「半分明るい」印象になります
                    color = (row < splitPoint) ? "#FFFFFF" : "#BBBBBB"; 
                    visible = true;
                }
            } else if (currentAttr === 'dark') {
                // 闇の民：0(黒)のみ表示
                if (val === 0) {
                    // 左（過去）：ほぼ白に近いグレー / 右（未来）：明るいグレー
                    color = (col < splitPoint) ? "#EEEEEE" : "#BBBBBB"; 
                    visible = true;
                }
            }

            if (visible) {
                ctx.fillStyle = color;
                ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            }
        }
    }
}





// 4. UI操作用関数
// 属性切り替え（反転）関数
// 名前を switchFaction に統一（ブラウザ標準機能との競合を避ける）
// 属性反転ボタンの挙動を修正
function switchFaction() {
    // ロゼッタ使用中、または0章で未選択、または通常プレイ中は反転不可
    if (hasRosetta) return; 
    
    // 10章クリア後の自由時間、あるいは特定の条件下以外は「反転」を制限するならここ
    if (isFactionLocked && currentStageData.id !== 10) {
        alert("一度選んだ運命を覆すことはできません。");
        return;
    }

    currentAttr = (currentAttr === 'light') ? 'dark' : 'light';
    updateVisualMode();
    renderGame();
}

// 見た目（オーラとテキスト）を管理する共通関数
function updateVisualMode() {
    const body = document.body;
    const attrSpan = document.getElementById('player-attr');
    
    if (currentAttr === 'light') {
        body.classList.add('light-mode');
        body.classList.remove('dark-mode');
        if (attrSpan) {
            attrSpan.innerText = '光の民';
            // 個別のstyle指定を消すことでCSSのクラスが優先されます
            attrSpan.style.color = ""; 
        }
    } else {
        body.classList.add('dark-mode');
        body.classList.remove('light-mode');
        if (attrSpan) {
            attrSpan.innerText = '闇の民';
            attrSpan.style.color = "";
        }
    }
}

// game.js の独立した場所に配置
//function selectInitialFaction(faction) {
//    console.log("Faction selected: " + faction); // これがコンソールに出るか確認
//    currentAttr = faction;
//    isFactionLocked = true; // 属性を選択済みにする
//
//    // 選択肢を非表示にする
//    const selector = document.getElementById('faction-selector');
//    if (selector) {
//        selector.style.display = 'none';
//    }
//
//    // 画面のオーラ（白/紫）と文字を更新
//    updateVisualMode();
//    // ここで renderGame を呼ぶことで、地の文やドット絵が表示されます
//    renderGame(); 
//}

// 地の文の中にプレイヤーの入力内容を埋め込む関数
function renderStoryText() {
    const prologueEl = document.getElementById('story-prologue');
    const epilogueEl = document.getElementById('story-epilogue');
    
    if (!currentStageData || !prologueEl || !epilogueEl) return;

    // 地の文の元データを取得
    let prologueHtml = currentStageData.prologue || "";
    let epilogueHtml = currentStageData.epilogue || "";

    // 各単語の入力内容で {wX-X} を置換する
    if (currentStageData.words) {
        currentStageData.words.forEach(word => {
            // 入力があればその文字を、なければ「＿」を表示
            const userInput = (allChapterAnswers[currentStageData.id] && allChapterAnswers[currentStageData.id][word.id]) 
                              ? allChapterAnswers[currentStageData.id][word.id] 
                              : "＿";
            
            // 埋め込まれた文字を強調する装飾
            const wrappedInput = `<span class="highlight-word">${userInput}</span>`;
            
            // {w0-1} などのプレースホルダーを置換
            const placeholder = `{${word.id}}`;
            prologueHtml = prologueHtml.split(placeholder).join(wrappedInput);
            epilogueHtml = epilogueHtml.split(placeholder).join(wrappedInput);
        });
    }

    // 「。」の後に改行を入れてHTMLとして反映
    prologueEl.innerHTML = prologueHtml.split("。").filter(s => s).join("。<br>");
    epilogueEl.innerHTML = epilogueHtml.split("。").filter(s => s).join("。<br>");
}





// ロゼッタストーン切り替え関数
function toggleRosetta() {
    const rosettaBtn = document.getElementById('rosetta-btn');

    // 修正：ボタンが「無効(disabled)」でなければ、ステージ数に関わらず起動を許可する
    // （既に unlockRosettaStone で disabled は解除されているため）
    if (rosettaBtn && rosettaBtn.disabled) {
        alert("石碑の全ての記録（Chapter 10）を読み解くまでは、その石は反応しない。");
        return;
    }

    hasRosetta = !hasRosetta;
    
    const body = document.body;
    const attrSpan = document.getElementById('player-attr');

    if (hasRosetta) {
        // --- ロゼッタ起動時：10章(逆転の起点)へ ---
        alert("ロゼッタストーンが共鳴し、刻（とき）が遡り始める……。");
        body.classList.add('rosetta-mode');
        body.classList.remove('light-mode', 'dark-mode');
        if (attrSpan) attrSpan.innerText = 'ー';
        
        // 10章から遡る旅を開始
        loadStage(10); 
    } else {
        // --- ロゼッタ解除時：1章に戻る ---
        alert("真実の視界が閉じ、元の時間が流れ出した。");
        body.classList.remove('rosetta-mode');
        updateVisualMode();
        
        loadStage(1);
    }

    reverseStageList();
}







// ヒントボタンから呼び出される関数
function toggleHints() {
    showHints = !showHints;
    
    // クラスを付け替えて表示・非表示を制御
    const subTexts = document.querySelectorAll('.sub-text');
    subTexts.forEach(el => {
        if (showHints) {
            el.classList.add('show');
        } else {
            el.classList.remove('show');
        }
    });

    const hintBtn = document.getElementById('hint-btn');
    if (hintBtn) {
        hintBtn.innerText = showHints ? 'ヒント：ON' : 'ヒント：OFF';
    }
}


// リスト逆転処理を関数として独立させると管理しやすいです
function reverseStageList() {
    const stageList = document.getElementById('stage-list');
    if (!stageList) return;
    const stages = Array.from(stageList.children);
    stageList.classList.add('list-reversing');
    setTimeout(() => {
        stages.reverse().forEach(li => stageList.appendChild(li));
        stageList.classList.remove('list-reversing');
    }, 500);
}




// メモをサーバーに保存する
async function saveMemo() {
    const memoContent = document.getElementById('memo-area').value;
    
    try {
        const response = await fetch('/api/memo/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: memoContent })
        });
        
        if (response.ok) {
            alert("メモをサーバーに保存しました");
        }
    } catch (error) {
        console.error("メモの保存に失敗しました", error);
    }
}

// 起動時にサーバーからメモを読み込む
async function loadSavedMemo() {
    try {
        const response = await fetch('/api/memo/load');
        const text = await response.text();
        document.getElementById('memo-area').value = text;
    } catch (error) {
        console.log("保存されたメモはありません");
    }
}

// window.onload の修正
window.onload = () => {
    updateVisualMode();
    // ここで loadStage(0) は呼ばず、タイトル画面を表示させたままにする
};