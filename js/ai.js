class AIManager {
  constructor(loadingEl) {
    this.loadingEl = loadingEl;
    this.worker = null;
    this.workerReady = false;
    this.loading = true;
    this.failed = false;
    this.stockfishUrl = "https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js";
    this.pending = null;

    this.depthByDifficulty = {
      easy: 2,
      normal: 6,
      hard: 12,
      hell: 18,
    };

    this.loadWorker();
  }

  setLoadingText(text) {
    if (this.loadingEl) {
      this.loadingEl.textContent = text;
      this.loadingEl.style.display = "block";
    }
  }

  hideLoadingText() {
    if (this.loadingEl) {
      this.loadingEl.style.display = "none";
    }
  }

  async loadWorker() {
    this.setLoadingText("Loading Stockfish...");
    try {
      const response = await fetch(this.stockfishUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      this.worker = new Worker(url);
      this.worker.onmessage = (event) => this.handleWorkerMessage(event.data);
      this.worker.onerror = () => {
        this.failed = true;
        this.loading = false;
        this.setLoadingText("Stockfish unavailable. Using fallback random AI.");
      };
      this.worker.postMessage("uci");
    } catch (err) {
      this.failed = true;
      this.loading = false;
      this.setLoadingText("Stockfish failed to load. Using fallback random AI.");
    }
  }

  handleWorkerMessage(raw) {
    const msg = String(raw || "");
    if (msg.includes("uciok")) {
      this.workerReady = true;
      this.loading = false;
      this.hideLoadingText();
      return;
    }

    if (!this.pending) {
      return;
    }

    if (msg.startsWith("bestmove")) {
      const best = msg.split(" ")[1];
      const pending = this.pending;
      this.pending = null;
      clearTimeout(pending.timeoutId);

      if (!best || best === "(none)") {
        pending.resolve(this.getRandomMoveFromFen(pending.fen));
        return;
      }
      pending.resolve(this.uciToMove(best));
    }
  }

  uciToMove(uci) {
    if (!uci || uci.length < 4) {
      return null;
    }
    const move = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
    if (uci.length > 4) {
      move.promotion = uci[4];
    }
    return move;
  }

  getRandomMoveFromFen(fen) {
    try {
      const temp = new Chess(fen);
      const legal = temp.moves({ verbose: true });
      if (!legal.length) {
        return null;
      }
      const pick = legal[Math.floor(Math.random() * legal.length)];
      return {
        from: pick.from,
        to: pick.to,
        promotion: pick.promotion,
      };
    } catch (e) {
      return null;
    }
  }

  async getBestMove(fen, difficulty, requestId) {
    const depth = this.depthByDifficulty[difficulty] || 6;

    if (difficulty === "easy" && Math.random() < 0.4) {
      return this.getRandomMoveFromFen(fen);
    }

    if (this.failed || !this.worker || !this.workerReady) {
      return this.getRandomMoveFromFen(fen);
    }

    if (this.pending) {
      clearTimeout(this.pending.timeoutId);
      this.pending.resolve(null);
      this.pending = null;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        if (this.pending && this.pending.requestId === requestId && this.pending.fen === fen) {
          this.pending = null;
          resolve(null);
        }
      }, 10000);

      this.pending = { resolve, timeoutId, requestId, fen };
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
    });
  }
}

window.AIManager = AIManager;
