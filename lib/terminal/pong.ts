export type PongPhase = "serve" | "playing" | "paused" | "gameover";

export type PongControls = {
  up: boolean;
  down: boolean;
};

type PongSide = "player" | "bot";

export type PongGameState = {
  phase: PongPhase;
  resumePhase: Exclude<PongPhase, "paused" | "gameover">;
  width: number;
  height: number;
  playerY: number;
  botY: number;
  playerVelocity: number;
  botVelocity: number;
  ballX: number;
  ballY: number;
  ballVelocityX: number;
  ballVelocityY: number;
  playerScore: number;
  botScore: number;
  serveOwner: PongSide;
  serveCountdownMs: number;
  serveTilt: number;
  lastTickAt: number | null;
  winner: PongSide | null;
  statusText: string;
};

export type PongFrame = {
  titleLine: string;
  scoreLine: string;
  statusLine: string;
  footerLine: string;
  boardLines: string[];
};

const BOARD_WIDTH = 48;
const BOARD_HEIGHT = 16;
const PADDLE_SIZE = 4;
const PADDLE_HALF_SPAN = (PADDLE_SIZE - 1) / 2;
const PLAYER_X = 2;
const BOT_X = BOARD_WIDTH - 3;
const PLAYER_SPEED = 30;
const BOT_TRACK_SPEED = 17;
const BOT_CENTER_SPEED = 10;
const BALL_BASE_SPEED = 20;
const BALL_MAX_SPEED = 34;
const MAX_DELTA_MS = 48;
const SERVE_COUNTDOWN_MS = 1200;
const MAX_BOUNCE_ANGLE = Math.PI / 3;
const COUNTDOWN_SLICE_MS = SERVE_COUNTDOWN_MS / 3;
const STATUS_WOBBLE_SCALE = 1.7;
const CENTER_LINE_X = Math.floor(BOARD_WIDTH / 2);

export const PONG_SCORE_TO_WIN = 7;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function neutralY(height: number) {
  return (height - 1) / 2;
}

function clampPaddleY(value: number, height: number) {
  return clamp(value, PADDLE_HALF_SPAN, height - 1 - PADDLE_HALF_SPAN);
}

function paddleTopRow(centerY: number, height: number) {
  return clamp(Math.round(centerY - PADDLE_HALF_SPAN), 0, height - PADDLE_SIZE);
}

function isPaddleRow(y: number, centerY: number, height: number) {
  const topRow = paddleTopRow(centerY, height);

  return y >= topRow && y < topRow + PADDLE_SIZE;
}

function reflectInsideCourt(value: number, maxValue: number) {
  let reflected = value;

  while (reflected < 0 || reflected > maxValue) {
    if (reflected < 0) {
      reflected = -reflected;
    }

    if (reflected > maxValue) {
      reflected = maxValue - (reflected - maxValue);
    }
  }

  return reflected;
}

function createServeTilt() {
  const rawTilt = Math.random() * 1.1 - 0.55;

  if (Math.abs(rawTilt) >= 0.18) {
    return rawTilt;
  }

  return rawTilt < 0 ? -0.18 : 0.18;
}

function makeServeState(
  playerScore: number,
  botScore: number,
  serveOwner: PongSide,
  statusText: string,
  lastTickAt: number | null = null,
): PongGameState {
  return {
    phase: "serve",
    resumePhase: "serve",
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    playerY: neutralY(BOARD_HEIGHT),
    botY: neutralY(BOARD_HEIGHT),
    playerVelocity: 0,
    botVelocity: 0,
    ballX: (BOARD_WIDTH - 1) / 2,
    ballY: (BOARD_HEIGHT - 1) / 2,
    ballVelocityX: 0,
    ballVelocityY: 0,
    playerScore,
    botScore,
    serveOwner,
    serveCountdownMs: SERVE_COUNTDOWN_MS,
    serveTilt: createServeTilt(),
    lastTickAt,
    winner: null,
    statusText,
  };
}

function makeGameOverState(
  playerScore: number,
  botScore: number,
  winner: PongSide,
  statusText: string,
  lastTickAt: number,
): PongGameState {
  return {
    phase: "gameover",
    resumePhase: "playing",
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    playerY: neutralY(BOARD_HEIGHT),
    botY: neutralY(BOARD_HEIGHT),
    playerVelocity: 0,
    botVelocity: 0,
    ballX: (BOARD_WIDTH - 1) / 2,
    ballY: (BOARD_HEIGHT - 1) / 2,
    ballVelocityX: 0,
    ballVelocityY: 0,
    playerScore,
    botScore,
    serveOwner: winner,
    serveCountdownMs: 0,
    serveTilt: 0,
    lastTickAt,
    winner,
    statusText,
  };
}

function launchServe(game: PongGameState): PongGameState {
  const serveDirection = game.serveOwner === "player" ? 1 : -1;
  const angle = game.serveTilt * MAX_BOUNCE_ANGLE;

  return {
    ...game,
    phase: "playing",
    resumePhase: "playing",
    serveCountdownMs: 0,
    ballVelocityX: Math.cos(angle) * BALL_BASE_SPEED * serveDirection,
    ballVelocityY: Math.sin(angle) * BALL_BASE_SPEED,
    statusText:
      game.serveOwner === "player"
        ? "Serve live. Find the corners."
        : "Incoming serve. Hold the line.",
  };
}

function awardPoint(
  game: PongGameState,
  scorer: PongSide,
  now: number,
): PongGameState {
  const nextPlayerScore = game.playerScore + (scorer === "player" ? 1 : 0);
  const nextBotScore = game.botScore + (scorer === "bot" ? 1 : 0);

  if (
    nextPlayerScore >= PONG_SCORE_TO_WIN ||
    nextBotScore >= PONG_SCORE_TO_WIN
  ) {
    return makeGameOverState(
      nextPlayerScore,
      nextBotScore,
      scorer,
      scorer === "player"
        ? "Match sealed. Press R for a rematch."
        : "Bot takes the set. Press R to answer back.",
      now,
    );
  }

  return makeServeState(
    nextPlayerScore,
    nextBotScore,
    scorer,
    scorer === "player"
      ? "Point to you. Resetting for the next serve."
      : "Bot scores. Recover and reset.",
    now,
  );
}

function applyPlayerMovement(
  game: PongGameState,
  controls: PongControls,
  deltaSeconds: number,
) {
  const direction = controls.up === controls.down ? 0 : controls.up ? -1 : 1;
  const playerVelocity = direction * PLAYER_SPEED;

  return {
    ...game,
    playerVelocity,
    playerY: clampPaddleY(
      game.playerY + playerVelocity * deltaSeconds,
      game.height,
    ),
  };
}

function predictedBotTarget(game: PongGameState) {
  const botDrift =
    Math.sin(game.playerScore * 1.71 + game.botScore * 0.93) *
    STATUS_WOBBLE_SCALE;

  if (game.phase !== "playing" || game.ballVelocityX <= 0) {
    return clampPaddleY(neutralY(game.height) + botDrift * 1.6, game.height);
  }

  const distanceToBot = BOT_X - game.ballX;
  const timeToIntercept = distanceToBot / Math.max(game.ballVelocityX, 0.01);
  const projectedY = reflectInsideCourt(
    game.ballY + game.ballVelocityY * timeToIntercept,
    game.height - 1,
  );
  const distanceBias = clamp(distanceToBot / BOARD_WIDTH, 0, 1);
  const readableMistake =
    Math.sin(game.ballX * 0.49 + game.ballY * 0.73 + game.botScore) *
    (1.2 + distanceBias * 1.1);

  return clampPaddleY(projectedY + botDrift + readableMistake, game.height);
}

function applyBotMovement(game: PongGameState, deltaSeconds: number) {
  const scorePressure = clamp(game.playerScore - game.botScore, -2, 3);
  const baseSpeed =
    game.phase === "playing" && game.ballVelocityX > 0
      ? BOT_TRACK_SPEED + scorePressure * 0.7
      : BOT_CENTER_SPEED;
  const targetY = predictedBotTarget(game);
  const deltaY = targetY - game.botY;
  const maxStep = baseSpeed * deltaSeconds;
  const appliedStep = clamp(deltaY, -maxStep, maxStep);

  return {
    ...game,
    botVelocity: deltaSeconds === 0 ? 0 : appliedStep / deltaSeconds,
    botY: clampPaddleY(game.botY + appliedStep, game.height),
  };
}

function bounceFromPaddle(
  game: PongGameState,
  side: PongSide,
  ballX: number,
  ballY: number,
) {
  const paddleY = side === "player" ? game.playerY : game.botY;
  const paddleVelocity =
    side === "player" ? game.playerVelocity : game.botVelocity;
  const speed = clamp(
    Math.hypot(game.ballVelocityX, game.ballVelocityY) *
      (side === "player" ? 1.025 : 1.015),
    BALL_BASE_SPEED,
    BALL_MAX_SPEED,
  );
  const impactRatio = clamp(
    (ballY - paddleY) / (PADDLE_HALF_SPAN + 0.5),
    -1,
    1,
  );
  const spinRatio = clamp(paddleVelocity / PLAYER_SPEED, -1, 1) * 0.22;
  const angle = clamp(impactRatio * 0.84 + spinRatio, -1, 1) * MAX_BOUNCE_ANGLE;
  const horizontalDirection = side === "player" ? 1 : -1;

  return {
    ballX,
    ballY,
    ballVelocityX: Math.cos(angle) * speed * horizontalDirection,
    ballVelocityY: Math.sin(angle) * speed,
    statusText:
      side === "player"
        ? Math.abs(impactRatio) > 0.62
          ? "Sharp return."
          : "Clean pickup."
        : "Bot sends it back.",
  };
}

export function createPongGameState(): PongGameState {
  return makeServeState(0, 0, "player", "PONG.TTY booted. First to seven.");
}

export function restartPongGameState(): PongGameState {
  return createPongGameState();
}

export function togglePongPause(game: PongGameState): PongGameState {
  if (game.phase === "gameover") {
    return game;
  }

  if (game.phase === "paused") {
    return {
      ...game,
      phase: game.resumePhase,
      lastTickAt: null,
      statusText:
        game.resumePhase === "serve"
          ? "Back on the serve clock."
          : "Back in play.",
    };
  }

  return {
    ...game,
    phase: "paused",
    resumePhase: game.phase,
    lastTickAt: null,
    statusText: "Paused. Press P to resume.",
  };
}

export function tickPongGame(
  game: PongGameState,
  controls: PongControls,
  now: number,
): PongGameState {
  if (game.phase === "paused" || game.phase === "gameover") {
    return game;
  }

  const deltaMs =
    game.lastTickAt === null
      ? 16
      : clamp(now - game.lastTickAt, 0, MAX_DELTA_MS);
  const deltaSeconds = deltaMs / 1000;
  const playerAdjusted = applyPlayerMovement(game, controls, deltaSeconds);
  const positioned = applyBotMovement(
    {
      ...playerAdjusted,
      lastTickAt: now,
    },
    deltaSeconds,
  );

  if (positioned.phase === "serve") {
    const remainingCountdown = Math.max(
      0,
      positioned.serveCountdownMs - deltaMs,
    );
    const servedState = {
      ...positioned,
      serveCountdownMs: remainingCountdown,
    };

    return remainingCountdown === 0 ? launchServe(servedState) : servedState;
  }

  const previousBallX = positioned.ballX;
  const nextBallX = positioned.ballX + positioned.ballVelocityX * deltaSeconds;
  let nextBallY = positioned.ballY + positioned.ballVelocityY * deltaSeconds;
  let nextVelocityY = positioned.ballVelocityY;

  if (nextBallY < 0) {
    nextBallY = -nextBallY;
    nextVelocityY = Math.abs(nextVelocityY);
  } else if (nextBallY > positioned.height - 1) {
    nextBallY = reflectInsideCourt(nextBallY, positioned.height - 1);
    nextVelocityY = -Math.abs(nextVelocityY);
  }

  const playerPlaneX = PLAYER_X + 1;
  if (
    positioned.ballVelocityX < 0 &&
    nextBallX <= playerPlaneX &&
    previousBallX > playerPlaneX &&
    Math.abs(nextBallY - positioned.playerY) <= PADDLE_HALF_SPAN + 0.45
  ) {
    const bounce = bounceFromPaddle(
      {
        ...positioned,
        ballVelocityY: nextVelocityY,
      },
      "player",
      playerPlaneX,
      nextBallY,
    );

    return {
      ...positioned,
      ...bounce,
      lastTickAt: now,
    };
  }

  const botPlaneX = BOT_X - 1;
  if (
    positioned.ballVelocityX > 0 &&
    nextBallX >= botPlaneX &&
    previousBallX < botPlaneX &&
    Math.abs(nextBallY - positioned.botY) <= PADDLE_HALF_SPAN + 0.45
  ) {
    const bounce = bounceFromPaddle(
      {
        ...positioned,
        ballVelocityY: nextVelocityY,
      },
      "bot",
      botPlaneX,
      nextBallY,
    );

    return {
      ...positioned,
      ...bounce,
      lastTickAt: now,
    };
  }

  if (nextBallX < 0) {
    return awardPoint(positioned, "bot", now);
  }

  if (nextBallX > positioned.width - 1) {
    return awardPoint(positioned, "player", now);
  }

  return {
    ...positioned,
    ballX: nextBallX,
    ballY: nextBallY,
    ballVelocityY: nextVelocityY,
    lastTickAt: now,
  };
}

export function buildPongFrame(game: PongGameState): PongFrame {
  const topBorder = `+${"-".repeat(game.width)}+`;
  const boardLines: string[] = [topBorder];
  const roundedBallX = Math.round(game.ballX);
  const roundedBallY = Math.round(game.ballY);

  for (let y = 0; y < game.height; y += 1) {
    let row = "|";

    for (let x = 0; x < game.width; x += 1) {
      let glyph = " ";

      if (x === roundedBallX && y === roundedBallY) {
        glyph = "o";
      } else if (x === PLAYER_X && isPaddleRow(y, game.playerY, game.height)) {
        glyph = "#";
      } else if (x === BOT_X && isPaddleRow(y, game.botY, game.height)) {
        glyph = "#";
      } else if (x === CENTER_LINE_X && y % 2 === 0) {
        glyph = ":";
      }

      row += glyph;
    }

    boardLines.push(`${row}|`);
  }

  boardLines.push(topBorder);

  const statusLine =
    game.phase === "serve"
      ? `${game.statusText} Serve in ${Math.max(
          1,
          Math.ceil(game.serveCountdownMs / COUNTDOWN_SLICE_MS),
        )}...`
      : game.phase === "paused"
        ? "Paused. Press P to resume or Q to quit."
        : game.phase === "gameover"
          ? game.winner === "player"
            ? "You win. Press R to play again or Q to quit."
            : "Bot wins. Press R for a rematch or Q to quit."
          : game.statusText;

  return {
    titleLine: "PONG // terminal arena",
    scoreLine: `YOU ${game.playerScore}   BOT ${game.botScore}   FIRST TO ${PONG_SCORE_TO_WIN}`,
    statusLine,
    footerLine:
      game.phase === "gameover"
        ? "R restart  Q quit  Ctrl+C interrupt"
        : "W/S or Arrow keys move  P pause  Q quit  Ctrl+C interrupt",
    boardLines,
  };
}
