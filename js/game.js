class BoardRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.size = canvas.width;
    this.squareSize = this.size / 8;
    this.animation = null;
    this.pieceGlyphs = {
      w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
      b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
    };
  }

  resize(pixelSize) {
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(pixelSize * ratio);
    this.canvas.height = Math.floor(pixelSize * ratio);
    this.canvas.style.width = `${pixelSize}px`;
    this.canvas.style.height = `${pixelSize}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.size = pixelSize;
    this.squareSize = pixelSize / 8;
  }

  squareToXY(square) {
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]);
    return {
      x: file * this.squareSize,
      y: (8 - rank) * this.squareSize,
    };
  }

  xyToSquare(x, y) {
    const file = Math.floor(x / this.squareSize);
    const rankFromTop = Math.floor(y / this.squareSize);
    if (file < 0 || file > 7 || rankFromTop < 0 || rankFromTop > 7) {
      return null;
    }
    const rank = 8 - rankFromTop;
    return `${String.fromCharCode(97 + file)}${rank}`;
  }

  animateMove(move, piece) {
    if (!move || !piece) {
      return;
    }
    this.animation = {
      from: move.from,
      to: move.to,
      piece,
      startedAt: performance.now(),
      duration: 220,
    };
  }

  render(state) {
    const now = performance.now();
    if (this.animation && now - this.animation.startedAt > this.animation.duration) {
      this.animation = null;
    }

    this.drawBoard(state);

    if (this.animation) {
      requestAnimationFrame(() => this.render(state));
    }
  }

  drawBoard(state) {
    const c = this.ctx;
    c.clearRect(0, 0, this.size, this.size);

    for (let rankTop = 0; rankTop < 8; rankTop += 1) {
      for (let file = 0; file < 8; file += 1) {
        const light = (file + rankTop) % 2 === 0;
        c.fillStyle = light ? "#f0d9b5" : "#b58863";
        c.fillRect(file * this.squareSize, rankTop * this.squareSize, this.squareSize, this.squareSize);
      }
    }

    if (state.lastMove) {
      this.fillSquare(state.lastMove.from, "rgba(255, 221, 87, 0.25)");
      this.fillSquare(state.lastMove.to, "rgba(255, 221, 87, 0.36)");
    }
    if (state.selectedSquare) {
      this.fillSquare(state.selectedSquare, "rgba(90, 170, 255, 0.34)");
    }
    for (const sq of state.legalTargets || []) {
      const { x, y } = this.squareToXY(sq);
      c.fillStyle = "rgba(80, 205, 120, 0.45)";
      c.beginPath();
      c.arc(x + this.squareSize / 2, y + this.squareSize / 2, this.squareSize * 0.14, 0, Math.PI * 2);
      c.fill();
    }

    const anim = this.animation;
    for (let rankTop = 0; rankTop < 8; rankTop += 1) {
      for (let file = 0; file < 8; file += 1) {
        const square = `${String.fromCharCode(97 + file)}${8 - rankTop}`;
        const piece = state.board[rankTop][file];
        if (!piece) {
          continue;
        }

        if (anim && square === anim.from) {
          continue;
        }

        this.drawPiece(piece, file * this.squareSize, rankTop * this.squareSize);
      }
    }

    if (anim) {
      const t = Math.min(1, (performance.now() - anim.startedAt) / anim.duration);
      const p = t * t * (3 - 2 * t);
      const from = this.squareToXY(anim.from);
      const to = this.squareToXY(anim.to);
      const x = from.x + (to.x - from.x) * p;
      const y = from.y + (to.y - from.y) * p;
      this.drawPiece(anim.piece, x, y);
    }
  }

  fillSquare(square, color) {
    const c = this.ctx;
    const { x, y } = this.squareToXY(square);
    c.fillStyle = color;
    c.fillRect(x, y, this.squareSize, this.squareSize);
  }

  drawPiece(piece, x, y) {
    const c = this.ctx;
    const glyph = this.pieceGlyphs[piece.color][piece.type];
    c.font = `${Math.floor(this.squareSize * 0.82)}px "Segoe UI Symbol", "Noto Sans Symbols", serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.shadowColor = "rgba(0,0,0,0.55)";
    c.shadowBlur = Math.max(4, this.squareSize * 0.08);
    c.shadowOffsetX = this.squareSize * 0.03;
    c.shadowOffsetY = this.squareSize * 0.05;
    c.fillStyle = piece.color === "w" ? "#fffdf8" : "#121212";
    c.fillText(glyph, x + this.squareSize / 2, y + this.squareSize / 2 + this.squareSize * 0.02);
    c.shadowBlur = 0;
    c.shadowOffsetX = 0;
    c.shadowOffsetY = 0;
  }
}

class InputHandler {
  constructor(renderer, gameController) {
    this.renderer = renderer;
    this.gameController = gameController;
    this.canvas = renderer.canvas;

    this.canvas.addEventListener("click", (e) => this.handlePointer(e));
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.handlePointer(e.touches[0]);
    }, { passive: false });

    window.addEventListener("resize", () => this.handleResize());
    this.handleResize();
  }

  handlePointer(evt) {
    const rect = this.canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    const square = this.renderer.xyToSquare(x, y);
    if (square) {
      this.gameController.handleSquareClick(square);
    }
  }

  handleResize() {
    this.gameController.handleResize();
  }
}

class GameController {
  constructor() {
    this.startScreen = document.getElementById("start-screen");
    this.gameScreen = document.getElementById("game-screen");
    this.statusBar = document.getElementById("status-bar");
    this.historyEl = document.getElementById("move-history");
    this.capturedWhiteEl = document.getElementById("captured-white");
    this.capturedBlackEl = document.getElementById("captured-black");
    this.promotionOverlay = document.getElementById("promotion-overlay");

    this.canvas = document.getElementById("chess-canvas");
    this.effectsCanvas = document.getElementById("effects-canvas");
    this.boardContainer = document.getElementById("board-container");

    this.renderer = new BoardRenderer(this.canvas);
    this.effects = new EffectsManager(this.effectsCanvas);
    this.audio = new AudioManager();
    this.ai = new AIManager(document.getElementById("engine-loading"));

    this.input = new InputHandler(this.renderer, this);

    this.chess = new Chess();
    this.difficulty = "normal";
    this.selectedSquare = null;
    this.legalTargets = [];
    this.lastMove = null;
    this.gameEnded = false;
    this.aiThinking = false;
    this.requestId = 0;
    this.pendingPromotion = null;

    this.bindUI();
    this.refreshUI();
    this.effects.startLoop();
  }

  bindUI() {
    document.querySelectorAll("#start-screen [data-difficulty]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.audio.ensureContext();
        this.startGame(btn.dataset.difficulty);
      });
    });

    document.getElementById("new-game-btn").addEventListener("click", () => {
      this.audio.ensureContext();
      this.startGame(this.difficulty);
    });

    document.getElementById("undo-btn").addEventListener("click", () => {
      this.audio.ensureContext();
      this.undoMove();
    });

    document.getElementById("resign-btn").addEventListener("click", () => {
      this.audio.ensureContext();
      this.resign();
    });

    document.querySelectorAll("#promotion-overlay [data-piece]").forEach((btn) => {
      btn.addEventListener("click", () => this.completePromotion(btn.dataset.piece));
    });

    document.addEventListener("pointerdown", () => this.audio.ensureContext(), { once: true });
  }

  startGame(difficulty) {
    this.difficulty = difficulty;
    this.chess.reset();
    this.selectedSquare = null;
    this.legalTargets = [];
    this.lastMove = null;
    this.gameEnded = false;
    this.aiThinking = false;
    this.pendingPromotion = null;
    this.promotionOverlay.classList.add("hidden");
    this.requestId += 1;

    this.startScreen.classList.remove("active");
    this.gameScreen.classList.add("active");
    this.refreshUI();
  }

  resign() {
    if (this.gameEnded) {
      return;
    }
    this.requestId += 1;
    this.aiThinking = false;
    this.gameEnded = true;
    this.statusBar.textContent = "You resigned. Black wins.";
    this.audio.error();
  }

  undoMove() {
    this.requestId += 1;
    this.aiThinking = false;
    this.pendingPromotion = null;
    this.promotionOverlay.classList.add("hidden");

    if (this.gameEnded && this.chess.history().length === 0) {
      this.audio.error();
      return;
    }

    const first = this.chess.undo();
    if (!first) {
      this.audio.error();
      return;
    }

    // In AI mode, undo player + AI plies when possible.
    this.chess.undo();
    this.lastMove = null;
    this.selectedSquare = null;
    this.legalTargets = [];
    this.gameEnded = false;
    this.audio.move();
    this.refreshUI();
  }

  handleResize() {
    const size = Math.floor(this.boardContainer.clientWidth);
    this.renderer.resize(size);
    this.effects.resize(size);
    this.refreshUI();
  }

  handleSquareClick(square) {
    if (this.gameEnded || this.aiThinking || this.pendingPromotion) {
      return;
    }

    const piece = this.chess.get(square);
    if (!this.selectedSquare) {
      if (piece && piece.color === "w" && this.chess.turn() === "w") {
        this.selectedSquare = square;
        this.legalTargets = this.chess.moves({ square, verbose: true }).map((m) => m.to);
        this.refreshUI();
      }
      return;
    }

    if (square === this.selectedSquare) {
      this.selectedSquare = null;
      this.legalTargets = [];
      this.refreshUI();
      return;
    }

    if (piece && piece.color === "w") {
      this.selectedSquare = square;
      this.legalTargets = this.chess.moves({ square, verbose: true }).map((m) => m.to);
      this.refreshUI();
      return;
    }

    const legalMoves = this.chess.moves({ square: this.selectedSquare, verbose: true });
    const candidate = legalMoves.find((m) => m.to === square);
    if (!candidate) {
      this.audio.error();
      return;
    }

    if (candidate.flags.includes("p")) {
      this.pendingPromotion = { from: this.selectedSquare, to: square };
      this.promotionOverlay.classList.remove("hidden");
      return;
    }

    this.tryApplyMove({ from: this.selectedSquare, to: square });
  }

  completePromotion(pieceCode) {
    if (!this.pendingPromotion) {
      return;
    }
    const move = {
      from: this.pendingPromotion.from,
      to: this.pendingPromotion.to,
      promotion: pieceCode,
    };
    this.pendingPromotion = null;
    this.promotionOverlay.classList.add("hidden");
    this.tryApplyMove(move);
  }

  tryApplyMove(moveObj) {
    const movingPiece = this.chess.get(moveObj.from);
    const result = this.chess.move(moveObj);
    if (!result) {
      this.audio.error();
      return;
    }

    this.renderer.animateMove(result, movingPiece);
    this.selectedSquare = null;
    this.legalTargets = [];
    this.lastMove = { from: result.from, to: result.to };

    if (result.captured) {
      const targetXY = this.renderer.squareToXY(result.to);
      this.effects.capture(targetXY.x + this.renderer.squareSize / 2, targetXY.y + this.renderer.squareSize / 2);
      this.audio.capture();
    } else {
      this.audio.move();
    }

    this.finishMoveAndMaybeTriggerAI();
  }

  finishMoveAndMaybeTriggerAI() {
    this.refreshUI();

    const gameMessage = this.evaluateGameEnd();
    if (gameMessage) {
      this.gameEnded = true;
      this.statusBar.textContent = gameMessage;
      this.audio.checkmate();
      this.effects.checkmate();
      return;
    }

    if (this.chess.in_check()) {
      const kingSquare = this.findKingSquare(this.chess.turn());
      if (kingSquare) {
        const pos = this.renderer.squareToXY(kingSquare);
        this.effects.check(pos.x, pos.y, this.renderer.squareSize);
      }
      this.audio.check();
    }

    if (this.chess.turn() === "b") {
      this.requestAIMove();
    } else {
      this.statusBar.textContent = "White to move";
    }
  }

  evaluateGameEnd() {
    if (this.chess.in_checkmate()) {
      return this.chess.turn() === "w" ? "Checkmate - Black wins" : "Checkmate - White wins";
    }
    if (this.chess.in_stalemate()) {
      return "Stalemate - Draw";
    }
    if (this.chess.in_threefold_repetition()) {
      return "Threefold Repetition - Draw";
    }
    if (this.chess.insufficient_material()) {
      return "Insufficient Material - Draw";
    }
    if (this.chess.in_draw()) {
      return "50 Move Rule - Draw";
    }
    if (this.chess.game_over()) {
      return "Game Over";
    }
    return null;
  }

  async requestAIMove() {
    if (this.gameEnded) {
      return;
    }

    this.aiThinking = true;
    const fen = this.chess.fen();
    const myRequestId = ++this.requestId;
    this.statusBar.textContent = `Black thinking (${this.difficulty})...`;

    let best = await this.ai.getBestMove(fen, this.difficulty, myRequestId);

    if (!best) {
      best = this.ai.getRandomMoveFromFen(fen);
    }

    const stillValid = myRequestId === this.requestId && fen === this.chess.fen();
    if (!stillValid || !best || this.gameEnded) {
      this.aiThinking = false;
      this.refreshUI();
      return;
    }

    const movingPiece = this.chess.get(best.from);
    const result = this.chess.move({ from: best.from, to: best.to, promotion: best.promotion });
    if (!result) {
      this.aiThinking = false;
      this.refreshUI();
      return;
    }

    this.renderer.animateMove(result, movingPiece);
    this.lastMove = { from: result.from, to: result.to };

    if (result.captured) {
      const to = this.renderer.squareToXY(result.to);
      this.effects.capture(to.x + this.renderer.squareSize / 2, to.y + this.renderer.squareSize / 2);
      this.audio.capture();
    } else {
      this.audio.move();
    }

    this.aiThinking = false;
    this.refreshUI();

    const gameMessage = this.evaluateGameEnd();
    if (gameMessage) {
      this.gameEnded = true;
      this.statusBar.textContent = gameMessage;
      this.audio.checkmate();
      this.effects.checkmate();
      return;
    }

    if (this.chess.in_check()) {
      const kingSquare = this.findKingSquare(this.chess.turn());
      if (kingSquare) {
        const pos = this.renderer.squareToXY(kingSquare);
        this.effects.check(pos.x, pos.y, this.renderer.squareSize);
      }
      this.audio.check();
    }

    this.statusBar.textContent = "White to move";
  }

  findKingSquare(color) {
    const board = this.chess.board();
    for (let rankTop = 0; rankTop < 8; rankTop += 1) {
      for (let file = 0; file < 8; file += 1) {
        const piece = board[rankTop][file];
        if (piece && piece.type === "k" && piece.color === color) {
          return `${String.fromCharCode(97 + file)}${8 - rankTop}`;
        }
      }
    }
    return null;
  }

  updateCapturedPieces() {
    const hist = this.chess.history({ verbose: true });
    const byWhite = [];
    const byBlack = [];

    for (const move of hist) {
      if (!move.captured) {
        continue;
      }
      const glyph = move.color === "w"
        ? this.renderer.pieceGlyphs.b[move.captured]
        : this.renderer.pieceGlyphs.w[move.captured];
      if (move.color === "w") {
        byWhite.push(glyph);
      } else {
        byBlack.push(glyph);
      }
    }

    this.capturedWhiteEl.textContent = byWhite.join(" ");
    this.capturedBlackEl.textContent = byBlack.join(" ");
  }

  updateMoveHistory() {
    const hist = this.chess.history();
    this.historyEl.innerHTML = "";
    for (let i = 0; i < hist.length; i += 2) {
      const li = document.createElement("li");
      li.textContent = hist[i + 1] ? `${hist[i]} ${hist[i + 1]}` : hist[i];
      this.historyEl.appendChild(li);
    }
    this.historyEl.scrollTop = this.historyEl.scrollHeight;
  }

  refreshUI() {
    this.renderer.render({
      board: this.chess.board(),
      selectedSquare: this.selectedSquare,
      legalTargets: this.legalTargets,
      lastMove: this.lastMove,
    });
    this.updateMoveHistory();
    this.updateCapturedPieces();

    if (!this.gameScreen.classList.contains("active")) {
      return;
    }

    if (!this.gameEnded && !this.aiThinking) {
      this.statusBar.textContent = this.chess.turn() === "w" ? "White to move" : `Black to move (${this.difficulty})`;
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new GameController();
});
