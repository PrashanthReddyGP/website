// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gameContainer = document.getElementById('game-container');
    const player = document.getElementById('player');
    const playerEffect = document.getElementById('player-effect');
    const instructions = document.getElementById('instructions');
    const scoreDisplay = document.getElementById('score-display');
    const powerupTimersUI = document.getElementById('powerup-timers');
    const statusIconsUI = document.getElementById('status-icons');
    const shieldStatusIcon = document.getElementById('shield-status-icon');
    const wreckingBallStatusIcon = document.getElementById('wreckingball-status-icon');
    const gameOverMessage = document.getElementById('game-over-message');
    const finalScore = document.getElementById('final-score');
    const chargeIndicatorBar = document.getElementById('charge-indicator-bar');
    const chargeIndicatorFill = document.getElementById('charge-indicator-fill');

    // --- Game Dimensions ---
    let gameHeight; let gameWidth;

    // --- Player Constants ---
    let playerHeight; let playerWidth; const playerStartXRatio = 0.15;

    // --- Game Constants & Difficulty Scaling ---
    const baseGravity = 0.35; let currentGravity = baseGravity;
    const pipeWidth = 70; const minPipeHeight = 50;
    const baseObstacleSpeed = 3.0; const baseObstacleGap = 190;
    const baseMinSpawnFrequency = 80; const baseMaxSpawnFrequency = 140;
    const baseMaxGapShift = 80;
    const speedIncreasePerPoint = 0.005; const gapDecreasePerPoint = 0.15;
    const frequencyDecreasePerPoint = 0.1; const gapShiftIncreasePerPoint = 0.3;
    const maxObstacleSpeed = 6.5; const minObstacleGap = 115;
    const minSpawnFrequencyLimit = 45; const maxSpawnFrequencyLimit = 80;
    const maxGapShiftLimit = 350;

    // --- Player State ---
    let playerY; let playerX; let velocityY = 0;
    const playerBaseColor = '#FFD700'; // Gold

    // --- Charge Mechanic State ---
    let isCharging = false; let chargeStartTime = 0; let minJumpForce = 6;
    let maxJumpForce = 11.5; let chargeTimeForMaxForce = 800; let spacebarHeld = false;

    // --- Game State ---
    let gameStarted = false; let isGameOver = false; let score = 0;
    let animationFrameId = null;

    // --- Obstacle State ---
    let obstacles = []; let framesUntilNextObstacle = baseMaxSpawnFrequency;
    let lastGapCenterY = 0;

    // --- Item/Power-up Definitions ---
    const itemTypes = {
        SCORE: 'score', DASH: 'dash', MULTIPLIER: 'multiplier', SHIELD: 'shield',
        VACUUM: 'vacuum', SLOWMO: 'slowmo', WRECKINGBALL: 'wreckingball',
        ALCHEMY: 'alchemy', RAINBOW: 'rainbow',
    };
    const itemConfig = {
        [itemTypes.SCORE]: { size: 18, chance: 1.0 },
        [itemTypes.DASH]: { size: 20, chance: 0.06 },
        [itemTypes.MULTIPLIER]: { size: 20, chance: 0.05 },
        [itemTypes.SHIELD]: { size: 22, chance: 0.04 },
        [itemTypes.VACUUM]: { size: 20, chance: 0.03 },
        [itemTypes.SLOWMO]: { size: 20, chance: 0.03 },
        [itemTypes.WRECKINGBALL]: { size: 22, chance: 0.03 },
        [itemTypes.ALCHEMY]: { size: 20, chance: 0.02 },
        [itemTypes.RAINBOW]: { size: 22, chance: 0.02 },
    };
    const numItemsPerGap = 2;
    let items = [];

    // --- Hazard State ---
    let hazards = []; const baseHazardChance = 0.35;
    const hazardIncreasePerPoint = 0.002; const maxHazardChance = 0.65;
    const hazardSize = 22;

    // --- Power-up Active State Variables ---
    let isDashPhasing = false; let dashPhaseEndTime = 0; const dashPhaseDuration = 2000;
    let scoreMultiplier = 1; let scoreMultiplierEndTime = 0; const scoreMultiplierDuration = 8000;
    const scoreMultiplierValue = 2;
    let isVacuumActive = false; let vacuumEndTime = 0; const vacuumDuration = 6000; const vacuumRadius = 100;
    let isSlowMoActive = false; let slowMoEndTime = 0; const slowMoDuration = 4000; const slowMoFactor = 0.5;
    let isAlchemyActive = false; let alchemyEndTime = 0; const alchemyDuration = 5000; const alchemyScoreBonus = 5;
    let isRainbowRushActive = false; let rainbowRushEndTime = 0; const rainbowRushDuration = 6000; const rainbowScoreMultiplier = 3;
    let hasShield = false;
    let hasWreckingBall = false;

    // --- Gravity Zone State ---
    let gravityZones = [];
    const gravityZoneSpawnChance = 0.18;
    const gravityZoneWidth = 280;
    const gravityZoneTypes = [
        { multiplier: -0.8, typeClass: 'flipped' },
        { multiplier: 0.5, typeClass: 'low-g' },
        { multiplier: 1.5, typeClass: 'high-g' },
        { multiplier: 0.2, typeClass: 'floaty' },
        { multiplier: 0.0, typeClass: 'zero-g' },
    ];


    // --- Helper Functions for Difficulty Scaling ---
    function getCurrentObstacleSpeed(s) { return Math.min(baseObstacleSpeed + s * speedIncreasePerPoint, maxObstacleSpeed); }
    function getCurrentGapSize(s) { return Math.max(baseObstacleGap - s * gapDecreasePerPoint, minObstacleGap); }
    function getCurrentMinFrequency(s) { return Math.max(baseMinSpawnFrequency - s * frequencyDecreasePerPoint, minSpawnFrequencyLimit); }
    function getCurrentMaxFrequency(s) { return Math.max(baseMaxSpawnFrequency - s * frequencyDecreasePerPoint, getCurrentMinFrequency(s) + 20, maxSpawnFrequencyLimit); }
    function getCurrentHazardChance(s) { return Math.min(baseHazardChance + s * hazardIncreasePerPoint, maxHazardChance); }
    function getCurrentMaxGapShift(s) { return Math.min(baseMaxGapShift + s * gapShiftIncreasePerPoint, maxGapShiftLimit, gameHeight * 0.4); }

    // --- Function to Update Dimensions ---
    function updateDimensions() {
         gameHeight = gameContainer.clientHeight; gameWidth = gameContainer.clientWidth;
         if(player) { playerHeight = player.offsetHeight; playerWidth = player.offsetWidth; }
     }

    // --- Initialization ---
    function setupInitialUI() {
        updateDimensions();
        if (!player) { console.error("Player element not found on initial setup!"); return; }
        playerX = gameWidth * playerStartXRatio;
        playerY = gameHeight / 2 - playerHeight / 2;
        player.style.top = `${playerY}px`; player.style.left = `${playerX}px`;
        player.style.backgroundColor = playerBaseColor;
        if(instructions) instructions.style.display = 'block';
        if(scoreDisplay) scoreDisplay.style.display = 'none';
        if(gameOverMessage) gameOverMessage.style.display = 'none';
        if(chargeIndicatorBar) chargeIndicatorBar.style.display = 'none';
        updatePowerupTimersUI(); updateStatusIconsUI();
    }

    function initializeGame() {
        // console.log("%cinitializeGame: Called. GAME IS RESTARTING.", "color: red; font-weight: bold;"); // DEBUG: Make this stand out
        if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
        updateDimensions();

        playerX = gameWidth * playerStartXRatio; playerY = gameHeight / 2 - playerHeight / 2; velocityY = 0;
        if(player) {
            player.style.top = `${playerY}px`; player.style.left = `${playerX}px`;
            player.style.backgroundColor = playerBaseColor; player.style.transform = '';
            player.classList.remove(...Object.keys(itemTypes).map(k => k.toLowerCase() + '-active'), 'shield-active', 'wreckingball-ready', 'rainbow-active', 'slowmo-active', 'alchemy-active', 'vacuum-active');
            if(playerEffect) playerEffect.style.opacity = '0'; player.style.opacity = '1';
        }

        isCharging = false; spacebarHeld = false;
        if(chargeIndicatorFill) chargeIndicatorFill.style.width = '0%';
        if(chargeIndicatorBar) chargeIndicatorBar.style.display = 'none';

        isGameOver = false; gameStarted = true;
        // console.log("initializeGame: gameStarted set to true."); // DEBUG
        score = 0; updateScoreDisplay();

        const initialMinFreq = getCurrentMinFrequency(0); const initialMaxFreq = getCurrentMaxFrequency(0);
        framesUntilNextObstacle = Math.floor(Math.random() * (initialMaxFreq - initialMinFreq + 1)) + initialMinFreq;
        lastGapCenterY = gameHeight / 2;

        isDashPhasing = false; dashPhaseEndTime = 0; scoreMultiplier = 1; scoreMultiplierEndTime = 0;
        isVacuumActive = false; vacuumEndTime = 0; isSlowMoActive = false; slowMoEndTime = 0;
        isAlchemyActive = false; alchemyEndTime = 0; isRainbowRushActive = false; rainbowRushEndTime = 0;
        hasShield = false; hasWreckingBall = false;
        updatePowerupTimersUI(); updateStatusIconsUI();

        if(gameContainer) gameContainer.querySelectorAll('.pipe, .collectible, .hazard, .powerup-dash, .powerup-multiplier, .powerup-shield, .powerup-vacuum, .powerup-slowmo, .powerup-wreckingball, .powerup-alchemy, .powerup-rainbow, .gravity-zone').forEach(el => el.remove());
        obstacles = []; items = []; hazards = []; gravityZones = [];

        // console.log("initializeGame: Hiding instructions, showing score."); // DEBUG
        if(instructions) instructions.style.display = 'none';
        if(gameOverMessage) gameOverMessage.style.display = 'none';
        if(scoreDisplay) scoreDisplay.style.display = 'block';

        // console.log("initializeGame: Starting gameLoop."); // DEBUG
        if(animationFrameId === null && !isGameOver){ gameLoop(); }
    }


    // --- Game Loop ---
    function gameLoop() {
        if (isGameOver) { if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; } return; }
        const now = performance.now();

        if (!gameContainer || !player) { console.error("Missing critical element, stopping loop."); cancelAnimationFrame(animationFrameId); animationFrameId = null; return; }

        try {
            const baseSpeed = getCurrentObstacleSpeed(score);
            const currentEffectiveSpeed = isSlowMoActive ? baseSpeed * slowMoFactor : baseSpeed;

            currentGravity = baseGravity;
            const playerCenterX = playerX + playerWidth / 2;
            for (const zone of gravityZones) {
                if (playerCenterX >= zone.x && playerCenterX <= zone.x + zone.width) {
                    currentGravity = baseGravity * zone.gravityMultiplier; break;
                }
            }
            player.style.transform = currentGravity < 0 ? 'scaleY(-1)' : '';

            updateActivePowerups(now);

            if (currentGravity !== 0.0) { velocityY += currentGravity; }
            playerY += velocityY;

            // Boundaries Check
            if (playerY + playerHeight > gameHeight) {
                playerY = gameHeight - playerHeight;
                if (currentGravity > 0) { velocityY = 0; if (!isDashPhasing && !hasShield) { gameOver(); return; } else if (hasShield) { hasShield = false; updateStatusIconsUI(); } }
                else if (currentGravity < 0) { velocityY = -velocityY * 0.3; } else { velocityY = 0; }
            }
            if (playerY < 0) {
                playerY = 0;
                if (currentGravity < 0) { velocityY = 0; if (!isDashPhasing && !hasShield) { gameOver(); return; } else if (hasShield) { hasShield = false; updateStatusIconsUI(); } }
                else if (currentGravity > 0) { velocityY = -velocityY * 0.3; } else { velocityY = 0; }
            }

           player.style.top = `${playerY}px`;

            framesUntilNextObstacle--;
            if (framesUntilNextObstacle <= 0) {
                 createObstacleSet();
                 const minFreq = getCurrentMinFrequency(score); const maxFreq = getCurrentMaxFrequency(score);
                 framesUntilNextObstacle = Math.floor(Math.random() * (maxFreq - minFreq + 1)) + minFreq;
            }
            moveWorldElements(currentEffectiveSpeed);

            checkCollisions(now);
             if (isGameOver) { showGameOver(); return; }

            if (isVacuumActive) handleVacuumEffect();
            if (isCharging) { updateChargeIndicator(); }
            updatePowerupTimersUI(now);

            if (!isGameOver) { animationFrameId = requestAnimationFrame(gameLoop); }
            else { animationFrameId = null; }

        } catch (loopError) {
             console.error("Error within game loop:", loopError);
             isGameOver = true; showGameOver();
             if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
        }
     } // End gameLoop


    // --- Manage Active Powerups ---
    function updateActivePowerups(currentTime) {
        let stateChanged = false;

        if (isDashPhasing && currentTime >= dashPhaseEndTime) { isDashPhasing = false; stateChanged = true; }
        if (scoreMultiplier > 1 && currentTime >= scoreMultiplierEndTime) { scoreMultiplier = 1; stateChanged = true; }
        if (isVacuumActive && currentTime >= vacuumEndTime) { isVacuumActive = false; stateChanged = true; }
        if (isSlowMoActive && currentTime >= slowMoEndTime) { isSlowMoActive = false; stateChanged = true; }
        if (isAlchemyActive && currentTime >= alchemyEndTime) { isAlchemyActive = false; stateChanged = true; }
        if (isRainbowRushActive && currentTime >= rainbowRushEndTime) { isRainbowRushActive = false; stateChanged = true; }

        if (player) {
            player.classList.toggle('dash-active', isDashPhasing);
            player.classList.toggle('multiplier-active', scoreMultiplier > 1);
            player.classList.toggle('shield-active', hasShield);
            player.classList.toggle('vacuum-active', isVacuumActive);
            player.classList.toggle('slowmo-active', isSlowMoActive);
            player.classList.toggle('wreckingball-ready', hasWreckingBall);
            player.classList.toggle('alchemy-active', isAlchemyActive);
            player.classList.toggle('rainbow-active', isRainbowRushActive);

             let finalOpacity = 1; let finalBgColor = playerBaseColor;
             if (isDashPhasing) { finalOpacity = 0.7; finalBgColor = 'rgba(0, 200, 200, 0.6)'; }
             else if (isAlchemyActive) { finalBgColor = 'rgba(218, 112, 214, 0.8)'; }
             else if (isSlowMoActive) { finalBgColor = 'rgba(160, 82, 45, 0.8)'; }
             else if (isRainbowRushActive) { /* CSS handles color */ }

             player.style.opacity = finalOpacity;
             if (!isRainbowRushActive) { player.style.backgroundColor = finalBgColor; }
             else { if (stateChanged && !isRainbowRushActive) { player.style.backgroundColor = playerBaseColor; } }
        }

         // Update status icons if shield/wrecking ball state *might* have changed (safer here than just on timer expiry)
         updateStatusIconsUI(); // Call every frame might be slightly inefficient but ensures correctness

         return stateChanged;
    }

    // --- Update UI ---
    function updatePowerupTimersUI(currentTime) {
        if (!powerupTimersUI) return; powerupTimersUI.innerHTML = '';
        const now = currentTime || performance.now();
        const timers = [
             { condition: isDashPhasing, endTime: dashPhaseEndTime, text: 'Dash', color: '#00FFFF' },
             { condition: scoreMultiplier > 1, endTime: scoreMultiplierEndTime, text: `Score x${scoreMultiplierValue}`, color: '#FFD700' },
             { condition: isVacuumActive, endTime: vacuumEndTime, text: 'Vacuum', color: '#A9A9A9' },
             { condition: isSlowMoActive, endTime: slowMoEndTime, text: 'SlowMo', color: '#F4A460' },
             { condition: isAlchemyActive, endTime: alchemyEndTime, text: 'Alchemy', color: '#DA70D6' },
             { condition: isRainbowRushActive, endTime: rainbowRushEndTime, text: 'Rainbow', color: '#FFFFFF' },
        ];
        timers.forEach(timer => {
            if (timer.condition) {
                const remaining = Math.max(0, timer.endTime - now);
                if (remaining > 50) {
                    const e = document.createElement('div'); e.classList.add('timer-display');
                    e.textContent = `${timer.text}: ${(remaining/1000).toFixed(1)}s`;
                    e.style.color = timer.color; powerupTimersUI.appendChild(e);
                }
            }
        });
    }
    function updateStatusIconsUI() {
        if (!statusIconsUI || !shieldStatusIcon || !wreckingBallStatusIcon) return;
        shieldStatusIcon.style.display = hasShield ? 'inline-block' : 'none';
        wreckingBallStatusIcon.style.display = hasWreckingBall ? 'inline-block' : 'none';
    }

    // --- Input Handling ---
     function handleKeyDown(event) {
        if (!gameContainer || !player) return;
        // console.log(`handleKeyDown: Key pressed - ${event.code}. gameStarted: ${gameStarted}, isGameOver: ${isGameOver}`); // DEBUG
        if (event.code === 'Space') {
            // console.log("handleKeyDown: Spacebar detected."); // DEBUG
            event.preventDefault();
            if (isGameOver) { initializeGame(); return; }
            if (!gameStarted) { initializeGame(); }
            if (gameStarted && !isCharging && !spacebarHeld) {
                // console.log("handleKeyDown: Starting charge."); // DEBUG
                isCharging = true; spacebarHeld = true; chargeStartTime = performance.now();
                if(chargeIndicatorBar) chargeIndicatorBar.style.display = 'block'; updateChargeIndicator();
            }
        }
    }
    function handleKeyUp(event) {
        if (!gameContainer || !player) return;
        if (event.code === 'Space') {
            event.preventDefault(); spacebarHeld = false;
            if (isCharging) {
                // console.log("handleKeyUp: Releasing charge and jumping."); // DEBUG
                isCharging = false; if(chargeIndicatorBar) chargeIndicatorBar.style.display = 'none';
                const chargeDuration = Math.min(performance.now() - chargeStartTime, chargeTimeForMaxForce);
                const chargeRatio = chargeDuration / chargeTimeForMaxForce;
                const jumpForce = minJumpForce + (maxJumpForce - minJumpForce) * chargeRatio;
                velocityY = currentGravity >= 0 ? -jumpForce : jumpForce;
            }
        }
    }
    function updateChargeIndicator() {
         if (!isCharging || !chargeIndicatorFill) return;
         const chargeDuration = Math.min(performance.now() - chargeStartTime, chargeTimeForMaxForce);
         const chargeRatio = chargeDuration / chargeTimeForMaxForce;
         chargeIndicatorFill.style.width = `${chargeRatio * 100}%`;
     }


    // --- Obstacle, Item, Hazard, Zone Creation ---
    function createObstacleSet() {
        if (!gameContainer) return;
        const currentGap = getCurrentGapSize(score);
        const currentHazardChance = getCurrentHazardChance(score);
        const currentMaxShift = getCurrentMaxGapShift(score);

        const minTargetCenterY = Math.max((currentGap / 2) + minPipeHeight, lastGapCenterY - currentMaxShift);
        const maxTargetCenterY = Math.min(gameHeight - (currentGap / 2) - minPipeHeight, lastGapCenterY + currentMaxShift);
        const finalMinTargetY = Math.min(minTargetCenterY, maxTargetCenterY);
        const finalMaxTargetY = Math.max(minTargetCenterY, maxTargetCenterY);
        const targetCenterY = Math.random() * (finalMaxTargetY - finalMinTargetY) + finalMinTargetY;
        const topPipeHeight = Math.max(minPipeHeight, targetCenterY - currentGap / 2);
        const bottomPipeHeight = gameHeight - topPipeHeight - currentGap;
        const pipeX = gameWidth; const gapStartY = topPipeHeight;

        const topPipe = document.createElement('div'); topPipe.classList.add('pipe', 'pipe-top'); topPipe.style.cssText = `width:${pipeWidth}px; height:${topPipeHeight}px; left:${pipeX}px; top:0px;`; gameContainer.appendChild(topPipe);
        const bottomPipe = document.createElement('div'); bottomPipe.classList.add('pipe', 'pipe-bottom'); bottomPipe.style.cssText = `width:${pipeWidth}px; height:${bottomPipeHeight}px; left:${pipeX}px; bottom:0px;`; gameContainer.appendChild(bottomPipe);
        obstacles.push({ topEl: topPipe, bottomEl: bottomPipe, x: pipeX, gapY: gapStartY, gapHeight: currentGap, scored: false });
        lastGapCenterY = gapStartY + currentGap / 2;

        let spawnedPowerupThisGap = false;
        let availableItemTypes = Object.keys(itemTypes).filter(k => k !== 'SCORE');
        let cumulativeChance = 0;
        let chanceMap = availableItemTypes.map(typeKey => { const config = itemConfig[itemTypes[typeKey]]; cumulativeChance += config.chance; return { type: itemTypes[typeKey], threshold: cumulativeChance, config: config }; });

        for (let i = 0; i < numItemsPerGap; i++) {
            let itemType = itemTypes.SCORE; let itemSize = itemConfig[itemType].size; let itemClass = 'collectible';
            if (!spawnedPowerupThisGap) { const rand = Math.random(); for (const entry of chanceMap) { if (rand < entry.threshold) { itemType = entry.type; itemSize = entry.config.size; itemClass = `powerup-${itemType}`; spawnedPowerupThisGap = true; break; } } }
            if (itemType === itemTypes.SCORE) { itemClass = 'collectible'; }

            const itemElement = document.createElement('div'); itemElement.classList.add(itemClass);
            const finalX = pipeX + (pipeWidth / 2) - (itemSize / 2) + (Math.random() * 40 - 20);
            const finalY = gapStartY + (itemSize / 2) + Math.random() * (currentGap - itemSize * 2);
            const finalClampedY = Math.max(gapStartY, Math.min(finalY, gapStartY + currentGap - itemSize));
            itemElement.style.cssText = `left:${finalX}px; top:${finalClampedY}px; width:${itemSize}px; height:${itemSize}px;`;
            gameContainer.appendChild(itemElement);
            items.push({ element: itemElement, x: finalX, y: finalClampedY, width: itemSize, height: itemSize, type: itemType });
        }

        if (Math.random() < currentHazardChance) {
            const hazard = document.createElement('div'); hazard.classList.add('hazard');
            const hX = pipeX + (pipeWidth / 2) - (hazardSize / 2) + (Math.random() * 30 - 15);
            const hY = gapStartY + (hazardSize / 2) + Math.random() * (currentGap - hazardSize * 2);
            const clampedHY = Math.max(gapStartY, Math.min(hY, gapStartY + currentGap - hazardSize));
            let tooClose = false; items.slice(-numItemsPerGap).forEach(itm => { if (itm && itm.element && Math.abs(hX - itm.x) < (hazardSize + itm.width) && Math.abs(clampedHY - itm.y) < (hazardSize + itm.height)) { tooClose = true; } });
            if (!tooClose) { hazard.style.cssText = `left:${hX}px; top:${clampedHY}px; width:${hazardSize}px; height:${hazardSize}px;`; gameContainer.appendChild(hazard); hazards.push({ element: hazard, x: hX, y: clampedHY, width: hazardSize, height: hazardSize }); }
        }

        if (Math.random() < gravityZoneSpawnChance) { createGravityZone(pipeX + pipeWidth + Math.random() * 100 + 50); }
    }

    function createGravityZone(startX) {
        if (!gameContainer || startX > gameWidth) return;
        const zoneHeight = gameHeight; const zoneY = 0;
        const zoneType = gravityZoneTypes[Math.floor(Math.random() * gravityZoneTypes.length)];
        const zoneElement = document.createElement('div');
        zoneElement.classList.add('gravity-zone', zoneType.typeClass);
        zoneElement.style.cssText = `left:${startX}px; top:${zoneY}px; width:${gravityZoneWidth}px; height:${zoneHeight}px;`;
        gameContainer.appendChild(zoneElement);
        gravityZones.push({ element: zoneElement, x: startX, width: gravityZoneWidth, y: zoneY, height: zoneHeight, gravityMultiplier: zoneType.multiplier, typeClass: zoneType.typeClass });
    }

    // --- Movement ---
    function moveWorldElements(currentSpeed) {
        try {
            obstacles.forEach(o => { o.x -= currentSpeed; if(o.topEl) o.topEl.style.left = `${o.x}px`; if(o.bottomEl) o.bottomEl.style.left = `${o.x}px`; if (!o.scored && o.x + pipeWidth < playerX) { o.scored = true; } });
            items.forEach((i, index) => { // Log added here for debugging previous issue
                const oldX = i.x;
                i.x -= currentSpeed;
                if(i.element) {
                    // if (i.type === itemTypes.SCORE) { console.log(`Moving SCORE item [${index}]: oldX=${oldX.toFixed(1)}, newX=${i.x.toFixed(1)}, speed=${currentSpeed.toFixed(2)}`); } // Keep commented unless needed
                    i.element.style.left = `${i.x}px`;
                } else { /* console.warn(`Item [${index}] being moved has no element! Type: ${i.type}`); */ } // Keep commented unless needed
            });
            hazards.forEach(h => { h.x -= currentSpeed; if(h.element) h.element.style.left = `${h.x}px`; });
            gravityZones.forEach(z => { z.x -= currentSpeed; if(z.element) z.element.style.left = `${z.x}px`; });

            obstacles = obstacles.filter(o => { if(o.x + pipeWidth < 0){ if(o.topEl) o.topEl.remove(); if(o.bottomEl) o.bottomEl.remove(); return false; } return true; });
            items = items.filter(i => { if(i.x + i.width < 0){ if(i.element) i.element.remove(); return false; } return true; });
            hazards = hazards.filter(h => { if(h.x + h.width < 0){ if(h.element) h.element.remove(); return false; } return true; });
            gravityZones = gravityZones.filter(z => { if(z.x + z.width < 0){ if(z.element) z.element.remove(); return false; } return true; });
        } catch (moveError) {
            console.error("Error during element movement/removal:", moveError);
        }
    }

    // --- Vacuum Effect ---
    function handleVacuumEffect() {
        if (!player) return;
        const playerCenterX = playerX + playerWidth / 2; const playerCenterY = playerY + playerHeight / 2;
        // Use filter directly on items array
        items = items.filter(itm => {
            if (itm.type === itemTypes.SCORE) {
                const itemCenterX = itm.x + itm.width / 2; const itemCenterY = itm.y + itm.height / 2;
                const dx = playerCenterX - itemCenterX; const dy = playerCenterY - itemCenterY; const distSq = dx * dx + dy * dy;
                if (distSq < vacuumRadius * vacuumRadius) {
                    // console.log("Vacuuming score item"); // DEBUG
                    score += collectibleValue * scoreMultiplier; updateScoreDisplay();
                    if(itm.element) itm.element.remove();
                    return false; // Remove this item
                }
            }
            return true; // Keep other items
        });
    }


    // --- Collision Detection (Using filter for items) ---
    function checkCollisions(now) {
        if (!player || isGameOver) return;
        const playerRect = { left: playerX, right: playerX + playerWidth, top: playerY, bottom: playerY + playerHeight };
        let visualsNeedUpdate = false;

        try {
            // 1. Pipe Collisions
            for (const obs of obstacles) {
                 let hitPipe = false;
                 const topPipeRect = { left: obs.x, right: obs.x + pipeWidth, top: 0, bottom: obs.gapY };
                 const bottomPipeRect = { left: obs.x, right: obs.x + pipeWidth, top: obs.gapY + obs.gapHeight, bottom: gameHeight };
                 if (isRectOverlap(playerRect, topPipeRect) || isRectOverlap(playerRect, bottomPipeRect)) {
                     hitPipe = true;
                     if (hasWreckingBall) { hasWreckingBall = false; visualsNeedUpdate = true; obstacles = obstacles.filter(o => o !== obs); if(obs.topEl) obs.topEl.remove(); if(obs.bottomEl) obs.bottomEl.remove(); hitPipe = false; }
                     else if (isDashPhasing) { hitPipe = false; }
                     else if (hasShield) { hasShield = false; visualsNeedUpdate = true; hitPipe = false; }
                     if (hitPipe) { gameOver(); return; }
                 }
            }
             if (isGameOver) return;

            // 2. Item Collisions (Refactored using filter)
            items = items.filter(itm => {
                const itemRect = { left: itm.x, right: itm.x + itm.width, top: itm.y, bottom: itm.y + itm.height };

                if (isRectOverlap(playerRect, itemRect)) {
                    // Collision detected! Apply effect and remove.
                    // console.log(`%cApplying effect for: ${itm.type}`, "color: green;"); // DEBUG
                    try {
                        switch (itm.type) {
                            case itemTypes.SCORE: let sToAdd = collectibleValue; if(isRainbowRushActive) sToAdd *= rainbowScoreMultiplier; sToAdd *= scoreMultiplier; score += sToAdd; updateScoreDisplay(); break;
                            case itemTypes.DASH: isDashPhasing = true; dashPhaseEndTime = now + dashPhaseDuration; visualsNeedUpdate = true; break;
                            case itemTypes.MULTIPLIER: scoreMultiplier = scoreMultiplierValue; scoreMultiplierEndTime = now + scoreMultiplierDuration; visualsNeedUpdate = true; break;
                            case itemTypes.SHIELD: hasShield = true; visualsNeedUpdate = true; break;
                            case itemTypes.VACUUM: // console.log("%cApplying VACUUM effect START", "color: blue; font-weight: bold;");
                                isVacuumActive = true; vacuumEndTime = now + vacuumDuration; visualsNeedUpdate = true;
                                // console.log(`%cApplying VACUUM effect END - isVacuumActive: ${isVacuumActive}, endTime: ${vacuumEndTime}`, "color: blue;");
                                break;
                            case itemTypes.SLOWMO: isSlowMoActive = true; slowMoEndTime = now + slowMoDuration; visualsNeedUpdate = true; break;
                            case itemTypes.WRECKINGBALL: hasWreckingBall = true; visualsNeedUpdate = true; break;
                            case itemTypes.ALCHEMY: isAlchemyActive = true; alchemyEndTime = now + alchemyDuration; visualsNeedUpdate = true; break;
                            case itemTypes.RAINBOW: isRainbowRushActive = true; rainbowRushEndTime = now + rainbowRushDuration; visualsNeedUpdate = true; break;
                            default: console.warn(`Unknown item type collected: ${itm.type}`);
                        }

                        if (itm.element && itm.element.parentNode) { itm.element.remove(); }
                        else { console.warn("Tried to remove item element that was already gone or invalid:", itm.type); }
                        return false; // Remove this item from the array

                    } catch (error) {
                        console.error("Error applying/removing item effect:", error, "Item:", itm);
                        if (itm.element && itm.element.parentNode) itm.element.remove();
                        return false; // Remove from array even on error
                    }
                } else {
                    return true; // No overlap, keep this item
                }
            }); // End of items.filter
             if (isGameOver) return;

            // 3. Hazard Collisions
            // Use filter for hazards as well for consistency and safety removing during iteration
            hazards = hazards.filter(h => {
                const hazardRect = { left: h.x, right: h.x + h.width, top: h.y, bottom: h.y + h.height };
                if (isRectOverlap(playerRect, hazardRect)) {
                    let hitHazard = true;
                    if (isAlchemyActive) {
                        score += alchemyScoreBonus * scoreMultiplier; updateScoreDisplay();
                        if(h.element) h.element.remove();
                        hitHazard = false; // Don't count as hit
                    } else if (isDashPhasing) {
                        hitHazard = false; // Phasing ignores hazards
                    } else if (hasShield) {
                        hasShield = false; visualsNeedUpdate = true;
                        hitHazard = false; // Shield protects
                    }

                    if (hitHazard) {
                        gameOver(); // Game Over if hit and not protected
                        return false; // Remove hazard (though game is ending)
                    } else {
                        return false; // Remove hazard if alchemized or shielded
                    }
                }
                return true; // Keep hazard if no collision
            });
            if (isGameOver) return; // Exit if game ended during hazard check


            if (visualsNeedUpdate) { updateStatusIconsUI(); } // Update icons if needed

        } catch (collisionError) {
             console.error("Error during collision checks:", collisionError);
             if (!isGameOver) gameOver();
        }
     }
    function isRectOverlap(rect1, rect2) { return ( rect1.left < rect2.right && rect1.right > rect2.left && rect1.top < rect2.bottom && rect1.bottom > rect2.top ); }

    // --- Game Over & Score ---
    function gameOver() {
        if (isGameOver) return;
        // console.log("gameOver: Called."); // DEBUG
        isGameOver = true;
        if(player) {
            player.style.backgroundColor = '#888'; player.style.transform = '';
            player.classList.remove(...Object.keys(itemTypes).map(k => k.toLowerCase() + '-active'), 'shield-active', 'wreckingball-ready', 'rainbow-active', 'slowmo-active', 'alchemy-active', 'vacuum-active');
            if(playerEffect) playerEffect.style.opacity = '0'; player.style.opacity = '0.8';
        }
        if (isCharging) { isCharging = false; spacebarHeld = false; if(chargeIndicatorBar) chargeIndicatorBar.style.display = 'none'; }
        if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
    }
    function showGameOver() {
        // console.log("showGameOver: Displaying game over message."); // DEBUG
        if(finalScore) finalScore.textContent = score;
        if(gameOverMessage) gameOverMessage.style.display = 'block';
        if(scoreDisplay) scoreDisplay.style.display = 'none';
        updatePowerupTimersUI(); updateStatusIconsUI(); // Clear UI
        if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
    }
    function updateScoreDisplay() { if(scoreDisplay) scoreDisplay.textContent = `Score: ${score}`; }

    // --- Event Listeners ---
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);

    // --- Initial Page Load Setup ---
    setupInitialUI();

}); // End DOMContentLoaded
