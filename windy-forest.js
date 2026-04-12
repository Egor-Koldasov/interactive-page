(function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function noise2D(x, y, seed) {
    var value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
    return value - Math.floor(value);
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function createPalette(depth, glow) {
    var greenHue = lerp(132, 104, depth);
    var foliageLight = lerp(42, 62, glow);
    var foliage = "hsl(" + greenHue.toFixed(1) + " 72% " + foliageLight.toFixed(1) + "%)";
    var foliageWarm = "hsl(" + (greenHue - 18).toFixed(1) + " 82% " + (foliageLight + 8).toFixed(1) + "%)";
    var trunk = "hsl(" + lerp(22, 30, depth).toFixed(1) + " 42% " + lerp(24, 42, depth).toFixed(1) + "%)";
    var grass = "hsl(" + lerp(110, 86, depth).toFixed(1) + " 65% " + lerp(38, 55, glow).toFixed(1) + "%)";
    return { foliage: foliage, foliageWarm: foliageWarm, trunk: trunk, grass: grass };
  }

  function createTree(index, totalTrees, cols, rows, horizon) {
    var depth = (index + 1) / (totalTrees + 1);
    var baseX = Math.floor(lerp(2, cols - 3, Math.random()));
    var trunkHeight = Math.floor(lerp(rows * 0.16, rows * 0.42, Math.random()));
    var canopyRadius = Math.floor(lerp(3, 9, 1 - depth));
    var baseY = horizon + Math.floor(lerp(1, rows * 0.16, Math.random()));
    var phase = Math.random() * Math.PI * 2;
    var swayAmount = lerp(0.6, 3.8, 1 - depth);
    var palette = createPalette(depth, Math.random());

    return {
      baseX: baseX,
      baseY: clamp(baseY, horizon, rows - 2),
      topY: clamp(baseY - trunkHeight, 2, rows - 6),
      canopyRadius: canopyRadius,
      depth: depth,
      phase: phase,
      swayAmount: swayAmount,
      palette: palette
    };
  }

  function createParticle(cols, rows, horizon) {
    return {
      x: randomRange(0, cols),
      y: randomRange(0, horizon + rows * 0.12),
      speed: randomRange(0.06, 0.22),
      drift: randomRange(0.5, 1.8),
      bob: randomRange(0.15, 0.7),
      phase: randomRange(0, Math.PI * 2),
      char: pick(["*", "+", ".", "`", "o"]),
      color: pick([
        "hsl(42 96% 72%)",
        "hsl(26 100% 72%)",
        "hsl(58 92% 76%)",
        "hsl(150 78% 70%)"
      ])
    };
  }

  function ensureTargetStyles(element) {
    var computed = window.getComputedStyle(element);

    if (computed.position === "static") {
      element.style.position = "relative";
    }

    if (!element.style.overflow) {
      element.style.overflow = "hidden";
    }
  }

  function measureCell(element, fontSize, lineHeight, fontFamily) {
    var probe = document.createElement("span");
    probe.textContent = "MMMMMMMMMM";
    probe.setAttribute("aria-hidden", "true");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.whiteSpace = "pre";
    probe.style.fontFamily = fontFamily;
    probe.style.fontSize = fontSize + "px";
    probe.style.lineHeight = String(lineHeight);

    element.appendChild(probe);

    var rect = probe.getBoundingClientRect();
    var width = rect.width / 10;
    var height = rect.height;

    probe.remove();

    return {
      width: width || fontSize * 0.62,
      height: height || fontSize * lineHeight
    };
  }

  function setCell(cells, colors, x, y, char, color) {
    if (y < 0 || y >= cells.length || x < 0 || x >= cells[0].length) {
      return;
    }

    cells[y][x] = char;
    colors[y][x] = color;
  }

  function renderLine(chars, colors) {
    var html = "";
    var currentColor = null;
    var buffer = "";

    function flush() {
      if (!buffer) {
        return;
      }

      var text = escapeHtml(buffer);
      html += currentColor ? '<span style="color:' + currentColor + '">' + text + "</span>" : text;
      buffer = "";
    }

    for (var index = 0; index < chars.length; index += 1) {
      var nextColor = colors[index];
      if (nextColor !== currentColor) {
        flush();
        currentColor = nextColor;
      }

      buffer += chars[index];
    }

    flush();
    return html;
  }

  function createWindyForestAscii(target, options) {
    options = options || {};

    if (!(target instanceof Element)) {
      throw new Error("createWindyForestAscii requires a DOM element target.");
    }

    ensureTargetStyles(target);

    var width = target.clientWidth;
    var height = target.clientHeight;

    if (!width || !height) {
      throw new Error("Target element needs a non-zero size before rendering.");
    }

    var fontFamily = options.fontFamily || '"Cascadia Mono", "SFMono-Regular", Consolas, monospace';
    var fontSize = options.fontSize || clamp(Math.floor(Math.min(width, height) / 22), 8, 18);
    var lineHeight = options.lineHeight || 1.04;
    var cell = measureCell(target, fontSize, lineHeight, fontFamily);
    var cols = Math.max(12, Math.floor(width / cell.width));
    var rows = Math.max(8, Math.floor(height / cell.height));
    var horizon = Math.floor(rows * 0.66);
    var treeCount = clamp(Math.floor(cols / 11), 4, 14);
    var particles = [];
    var trees = [];
    var rafId = 0;
    var running = false;
    var startTime = performance.now();
    var overlay = document.createElement("pre");

    overlay.setAttribute("aria-hidden", "true");
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.margin = "0";
    overlay.style.padding = "0";
    overlay.style.overflow = "hidden";
    overlay.style.whiteSpace = "pre";
    overlay.style.fontFamily = fontFamily;
    overlay.style.fontSize = fontSize + "px";
    overlay.style.lineHeight = String(lineHeight);
    overlay.style.letterSpacing = "0";
    overlay.style.userSelect = "none";
    overlay.style.pointerEvents = "none";
    overlay.style.color = "#dff6f4";
    overlay.style.textShadow = "0 0 10px rgba(11, 14, 28, 0.35)";
    overlay.style.background = [
      "radial-gradient(circle at 20% 15%, rgba(255, 183, 77, 0.16), transparent 30%)",
      "radial-gradient(circle at 80% 22%, rgba(120, 221, 196, 0.18), transparent 28%)",
      "linear-gradient(180deg, #18314f 0%, #274060 28%, #49626d 56%, #1f3322 100%)"
    ].join(",");

    target.replaceChildren(overlay);

    for (var particleIndex = 0; particleIndex < clamp(Math.floor(cols / 5), 8, 24); particleIndex += 1) {
      particles.push(createParticle(cols, rows, horizon));
    }

    for (var treeIndex = 0; treeIndex < treeCount; treeIndex += 1) {
      trees.push(createTree(treeIndex, treeCount, cols, rows, horizon));
    }

    trees.sort(function (left, right) {
      return left.depth - right.depth;
    });

    function drawSky(cells, colors, time, wind) {
      for (var cloud = 0; cloud < 3; cloud += 1) {
        var cloudY = 2 + cloud * Math.max(2, Math.floor(horizon / 5));
        var cloudWidth = Math.max(8, Math.floor(cols / (5 + cloud)));
        var cloudX = Math.floor(((time * (0.9 + cloud * 0.3)) + cloud * cols * 0.37) % (cols + cloudWidth * 2)) - cloudWidth;

        for (var x = 0; x < cloudWidth; x += 1) {
          var px = cloudX + x;
          var wobble = Math.sin(time * 1.2 + x * 0.45 + cloud) * 0.8;
          var py = Math.round(cloudY + wobble);
          var char = x % 7 === 0 ? "~" : x % 5 === 0 ? "=" : "-";
          var color = cloud === 0 ? "hsl(38 90% 74%)" : "hsl(188 55% 78%)";

          if (noise2D(px, py, cloud + 1) > 0.18) {
            setCell(cells, colors, px, py, char, color);
          }
        }
      }

      for (var x = 0; x < cols; x += 1) {
        if ((x + Math.floor(time * 7)) % 17 === 0) {
          var sparkleY = 1 + Math.floor((Math.sin(x * 0.32 + time) + 1) * Math.max(1, horizon * 0.18));
          var sparkleSeed = noise2D(x, sparkleY, 11);
          var sparkleChar = sparkleSeed > 0.66 ? "." : sparkleSeed > 0.33 ? "'" : "`";
          setCell(cells, colors, x, sparkleY, sparkleChar, "hsl(54 92% 78%)");
        }

        if ((x + Math.floor(time * 5)) % 13 === 0) {
          var breezeY = Math.max(2, horizon - 3 + Math.round(Math.sin(x * 0.4 + time * 1.4) * 1.5));
          var breezeSeed = noise2D(x, breezeY, 15);
          var breezeChar = breezeSeed > 0.75 ? "~" : breezeSeed > 0.5 ? "-" : breezeSeed > 0.25 ? "=" : "_";
          setCell(
            cells,
            colors,
            x,
            breezeY,
            breezeChar,
            wind > 0 ? "hsl(170 56% 70%)" : "hsl(205 48% 72%)"
          );
        }
      }
    }

    function drawTree(cells, colors, tree, time, wind) {
      var trunkHeight = tree.baseY - tree.topY;
      var sway = Math.sin(time * 1.7 + tree.phase) * tree.swayAmount + wind * (1.2 - tree.depth * 0.75);
      var previousX = tree.baseX;

      for (var y = 0; y <= trunkHeight; y += 1) {
        var progress = y / Math.max(1, trunkHeight);
        var bend = Math.round(tree.baseX + sway * Math.pow(1 - progress, 1.6) * 0.45);
        var row = tree.baseY - y;
        var char = "|";

        if (bend > previousX) {
          char = "/";
        } else if (bend < previousX) {
          char = "\\";
        }

        previousX = bend;
        setCell(cells, colors, bend, row, char, tree.palette.trunk);

        if (y > trunkHeight * 0.2 && noise2D(bend, row, tree.phase) > 0.84) {
          var branchSide = noise2D(bend + 17, row + 17, tree.phase * 2) > 0.5 ? 1 : -1;
          setCell(cells, colors, bend + branchSide, row, "'", tree.palette.foliageWarm);
        }
      }

      var canopyCenterX = Math.round(tree.baseX + sway);
      var canopyMidY = tree.topY + Math.floor(trunkHeight * 0.18);
      var radiusY = Math.max(2, Math.floor(tree.canopyRadius * 0.66));

      for (var offsetY = -radiusY; offsetY <= radiusY; offsetY += 1) {
        var spread = tree.canopyRadius - Math.abs(offsetY) * 0.75;

        for (var offsetX = -Math.ceil(spread); offsetX <= Math.ceil(spread); offsetX += 1) {
          var noise = Math.sin(offsetX * 1.1 + tree.phase) + Math.cos(offsetY * 1.4 + tree.phase * 0.8);
          if (noise < -0.25 || noise2D(offsetX, offsetY, tree.phase * 10) > 0.88) {
            continue;
          }

          var leafX = canopyCenterX + offsetX + Math.round(wind * (1 - tree.depth) * 0.6 * (1 - Math.abs(offsetY) / (radiusY + 1)));
          var leafY = canopyMidY + offsetY;
          var glow = Math.sin(time * 2.1 + offsetX * 0.7 + offsetY * 0.5 + tree.phase);
          var charSeed = noise2D(offsetX + tree.baseX, offsetY + tree.topY, tree.phase * 7);
          var char = glow > 0.45
            ? (charSeed > 0.66 ? "*" : charSeed > 0.33 ? "+" : "x")
            : (charSeed > 0.8 ? "&" : charSeed > 0.6 ? "Y" : charSeed > 0.4 ? "V" : charSeed > 0.2 ? "w" : "^");
          var color = glow > 0.25 ? tree.palette.foliageWarm : tree.palette.foliage;

          setCell(cells, colors, leafX, leafY, char, color);
        }
      }
    }

    function drawGround(cells, colors, time, wind) {
      for (var y = horizon; y < rows; y += 1) {
        var density = (y - horizon) / Math.max(1, rows - horizon);

        for (var x = 0; x < cols; x += 1) {
          if (noise2D(x, y, 4) > 0.12 + density * 0.24) {
            continue;
          }

          var sway = Math.sin(time * 3 + x * 0.38 + y * 0.2) * (1.2 + density * 2.4) + wind * 0.9;
          var charSeed = noise2D(x, y, 8);
          var char = sway > 1.15 ? "/" : sway < -1.15 ? "\\" : charSeed > 0.75 ? "|" : charSeed > 0.5 ? "'" : charSeed > 0.25 ? "," : ";";
          var green = 92 + Math.sin(x * 0.08 + time) * 18;
          var light = 34 + density * 21 + Math.cos(y + x * 0.15) * 4;
          var color = "hsl(" + green.toFixed(1) + " 60% " + light.toFixed(1) + "%)";
          setCell(cells, colors, x, y, char, color);
        }
      }

      var ridgeY = horizon - 1;
      for (var ridgeX = 0; ridgeX < cols; ridgeX += 1) {
        var hill = Math.round(ridgeY + Math.sin(ridgeX * 0.12) * 1.5 + Math.cos(ridgeX * 0.03 + time * 0.3) * 1.2);
        setCell(cells, colors, ridgeX, hill, "_", "hsl(138 30% 30%)");
      }
    }

    function drawParticles(cells, colors, time, wind) {
      for (var index = 0; index < particles.length; index += 1) {
        var particle = particles[index];
        var wrappedX = (particle.x + time * cols * particle.speed + wind * particle.drift * 4) % cols;
        var wrappedY = (particle.y + Math.sin(time * 2.8 + particle.phase) * particle.bob) % Math.max(1, horizon + 2);
        var x = Math.floor((wrappedX + cols) % cols);
        var y = Math.floor((wrappedY + Math.max(1, horizon + 2)) % Math.max(1, horizon + 2));

        setCell(cells, colors, x, y, particle.char, particle.color);
      }
    }

    function frame(now) {
      if (!running) {
        return;
      }

      var elapsed = (now - startTime) / 1000;
      var time = elapsed * (options.speed || 0.8);
      var wind = Math.sin(time * 0.9) * 0.8 + Math.sin(time * 2.4 + 1.2) * 0.45;
      var cells = Array.from({ length: rows }, function () {
        return Array(cols).fill(" ");
      });
      var colors = Array.from({ length: rows }, function () {
        return Array(cols).fill(null);
      });

      drawSky(cells, colors, time, wind);
      drawGround(cells, colors, time, wind);

      for (var treeIndex = 0; treeIndex < trees.length; treeIndex += 1) {
        drawTree(cells, colors, trees[treeIndex], time, wind);
      }

      drawParticles(cells, colors, time, wind);

      var htmlLines = [];
      for (var row = 0; row < rows; row += 1) {
        htmlLines.push(renderLine(cells[row], colors[row]));
      }

      overlay.innerHTML = htmlLines.join("\n");
      rafId = window.requestAnimationFrame(frame);
    }

    function start() {
      if (running) {
        return;
      }

      running = true;
      startTime = performance.now();
      rafId = window.requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    function destroy() {
      stop();
      overlay.remove();
    }

    start();

    return {
      element: overlay,
      start: start,
      stop: stop,
      destroy: destroy
    };
  }

  window.createWindyForestAscii = createWindyForestAscii;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { createWindyForestAscii: createWindyForestAscii };
  }
})();
