// ===============================================
// GAME STATE (Central state management for all game data)
// ===============================================
const gameState = {
    // Core game data
    score: 0,
    level: 1,
    lives: 3,
    isGameOver: false,
    inCombat: false,
    discoveries: 0,
    
    // New progression tracking
    turnCounter: 0,
    maxTurns: 150,
    dungeonDepth: 0,
    targetDepth: 10, // Win condition - defeat final boss at depth 10
    hasWon: false,
    finalBossDefeated: false, // Flag to track final boss victory
    
    // Enhanced encounter balancing system
    encounterHistory: {
        lastEventType: null, // 'combat', 'item', 'progress'
        combatsSinceProgress: 0,
        minCombatsBetweenProgress: 4, // Increased from 3 to 4 for more challenge
        // eventWeights adjusted for higher difficulty and more combat
        eventWeights: {
            combat: 35,    // Combat encounters for challenge
            item: 25,      // Item/treasure events
            progress: 20,  // Progress events
            choice: 15,    // Choice-based events for strategy
            risk: 5        // High-risk, high-reward events
        },
        repeatedTypeModifier: 0.3 // Even stronger anti-repetition (was 0.5)
    },
    
    // Combat specialization tracking for differentiated rewards
    combatSpecialization: {
        physicalMastery: 0,  // Improves physical attack success
        magicalMastery: 0,   // Improves magical attack success
        maxPhysicalMastery: 30, // Cap physical mastery for balance
        maxMagicalMastery: 30   // Cap magical mastery for balance
    },
    
    // Player character (contains all player data and behavior)
    character: {
        hp: 80,        // Reduced from 100 for more challenge
        maxHp: 80,     // Reduced from 100
        mana: 40,      // Reduced from 50
        maxMana: 40,   // Reduced from 50
        strength: 18,  // Reduced from 20
        agility: 12,   // Reduced from 15
        
        // Stat caps for balanced progression
        maxStrength: 50,   // Cap strength to prevent overwhelming damage
        maxAgility: 60,    // Cap agility for balanced defense
        maxMaxHp: 200,     // Cap max HP to maintain challenge
        maxMaxMana: 120,   // Cap max mana for resource management
        
        // Character methods (encapsulate character behavior for better organization)
        takeDamage: function(damage) {
            this.hp = Math.max(0, this.hp - damage);
            UI.updateDisplay();
            return this.hp <= 0;
        },
        
        heal: function(amount) {
            this.hp = Math.min(this.maxHp, this.hp + amount);
            UI.updateDisplay();
        },
        
        consumeMana: function(amount) {
            if (this.mana >= amount) {
                this.mana -= amount;
                UI.updateDisplay();
                return true;
            }
            return false;
        },
        
        restoreMana: function(amount) {
            this.mana = Math.min(this.maxMana, this.mana + amount);
            UI.updateDisplay();
        },
        
        levelUp: function(hpBonus = 20, manaBonus = 10, strBonus = 3, agiBonus = 2) {
            this.maxHp += hpBonus;
            this.hp = this.maxHp; // Full heal on level up
            this.maxMana += manaBonus;
            this.mana = this.maxMana; // Full mana on level up
            this.strength += strBonus;
            this.agility += agiBonus;
        },
        
        rest: function() {
            const hpRestore = Math.floor(this.maxHp * 0.3);
            const manaRestore = Math.floor(this.maxMana * 0.5);
            this.heal(hpRestore);
            this.restoreMana(manaRestore);
            return { hpRestore, manaRestore };
        }
    },
    
    // Current enemy (dynamically created during combat)
    currentEnemy: null,
    
    // Game state methods (centralize game logic to avoid scattered functions)
    reset: function() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.isGameOver = false;
        this.inCombat = false;
        this.discoveries = 0;
        this.turnCounter = 0;
        this.dungeonDepth = 0;
        this.hasWon = false;
        this.finalBossDefeated = false;
        this.currentEnemy = null;
        
        // Reset shop costs to base values for balanced progression
        Shop.upgrades.health.cost = Shop.upgrades.health.baseCost;
        Shop.upgrades.mana.cost = Shop.upgrades.mana.baseCost;
        Shop.upgrades.strength.cost = Shop.upgrades.strength.baseCost;
        Shop.upgrades.agility.cost = Shop.upgrades.agility.baseCost;
        Shop.upgrades.mastery.cost = Shop.upgrades.mastery.baseCost;
        Shop.upgrades.life.cost = Shop.upgrades.life.baseCost;
        
        // Reset encounter tracking
        this.encounterHistory = {
            lastEventType: null,
            combatsSinceProgress: 0,
            minCombatsBetweenProgress: 4, // Increased for difficulty
            eventWeights: {
                combat: 35,
                item: 25,
                progress: 20,
                choice: 15,
                risk: 5
            },
            repeatedTypeModifier: 0.3
        };
        
        // Reset combat mastery
        this.combatSpecialization = {
            physicalMastery: 0,
            magicalMastery: 0,
            maxPhysicalMastery: 30,
            maxMagicalMastery: 30
        };
        
        // Reset character with stat caps
        this.character.hp = 80;
        this.character.maxHp = 80;
        this.character.mana = 40;
        this.character.maxMana = 40;
        this.character.strength = 18;
        this.character.agility = 12;
        
        // Ensure caps are set
        this.character.maxStrength = 50;
        this.character.maxAgility = 60;
        this.character.maxMaxHp = 200;
        this.character.maxMaxMana = 120;
    },
    
    incrementTurn: function() {
        this.turnCounter++;
        
        if (this.turnCounter >= this.maxTurns && !this.hasWon) {
            this.gameOver("time");
        }
        
        // Check win condition - only when final boss is defeated
        if (this.finalBossDefeated && !this.hasWon) {
            this.gameWin();
        }
        
        UI.updateDisplay();
    },
    
    gameWin: function() {
        this.hasWon = true;
        this.isGameOver = true;
        UI.updateStory(`<i class="fas fa-trophy"></i> <strong>VICTORY!</strong> You have reached the deepest chamber of the dungeon and found the legendary treasure! The realm is saved!`);
        UI.addToLog("� GAME WON! You are a true hero!", "victory");
        UI.hideAllActionButtons();
    },
    
    gameOver: function(reason = "death") {
        this.isGameOver = true;
        
        if (reason === "time") {
            UI.updateStory(`<i class="fas fa-hourglass-end"></i> <strong>TIME'S UP!</strong> You spent too long in the dungeon and became lost forever in its dark passages...`);
            UI.addToLog("💀 GAME OVER - Time limit exceeded!", "death");
        } else if (reason === "victory") {
            UI.updateStory(`<i class="fas fa-trophy"></i> <strong>ULTIMATE VICTORY!</strong> You have conquered the deepest depths and defeated the Dungeon Lord! You emerge as a legendary hero, your name forever etched in the annals of greatness!`);
            UI.addToLog(`🏆 VICTORY! Final Score: ${this.score} points!`, "victory");
            UI.addToLog(`⏱️ Completed in ${this.turnCounter} turns!`, "victory");
            UI.addToLog("🎊 Congratulations, Champion of the Depths!", "victory");
            
            // Show share button after a brief delay
            setTimeout(() => {
                UI.showVictoryShareButton();
            }, 2000);
        } else {
            UI.updateStory(`<i class="fas fa-skull-crossbones"></i> <strong>GAME OVER!</strong> Your adventure ends here...`);
            UI.addToLog("💀 GAME OVER - No lives remaining!", "death");
        }
        
        UI.hideAllActionButtons();
        UI.addToLog("Click 'Start New Game' to try again!", "start");
    },
    
    addScore: function(points) {
        if (this.isGameOver) return;
        
        this.score += points;
        
        // More gradual level scaling - requires more points per level
        const newLevel = Math.floor(this.score / 750) + 1; // Increased from 500 to 750
        if (newLevel > this.level) {
            this.level = newLevel;
            // Reduced level up bonuses to make progression more gradual
            this.character.levelUp(15, 8, 2, 1); // Reduced from 20, 10, 3, 2
            UI.addToLog(`⭐ LEVEL UP! You are now level ${newLevel}! Stats increased and health restored!`, "levelup");
        }
        
        UI.updateDisplay();
        UI.addToLog(`Score increased by ${points}! Total: ${this.score}`, "score");
    },
    
    playerDeath: function() {
        this.lives--;
        if (this.lives <= 0) {
            this.gameOver("death");
        } else {
            this.character.hp = Math.floor(this.character.maxHp / 2); // Revive with half health
            UI.addToLog(`💀 You died! Respawning with ${this.lives} lives remaining...`, "death");
            UI.updateStory("<i class=\"fas fa-skull\"></i> Death! You have been defeated but your spirit endures. You respawn at the dungeon entrance.");
            Combat.endBattle();
        }
    },
    

};

// ===============================================
// GAME DATA (Centralized configuration and content data)
// ===============================================
const GameData = {
    // Depth-based enemy scaling with logical damage resistances/vulnerabilities
    enemyTypes: [
        // Early Dungeon Enemies (Depths 0-3) - Now much more threatening
        { 
            name: "Goblin", hp: 45, attack: 18, defense: 8, reward: 60, speed: 6, 
            description: "A vicious green creature with razor-sharp claws", 
            minDepth: 0, maxDepth: 4,
            resistances: { physical: 0.9, magical: 1.2 }, // Slightly resistant to physical, vulnerable to magic
            lore: "Goblins are nimble but have no magical defenses"
        },
        { 
            name: "Skeleton Warrior", hp: 40, attack: 22, defense: 6, reward: 55, speed: 3, 
            description: "An animated skeleton wielding a wickedly sharp blade", 
            minDepth: 0, maxDepth: 3,
            resistances: { physical: 1.1, magical: 0.8 }, // Resistant to magic (undead), vulnerable to physical crushing
            lore: "Undead bones are hard to damage with magic but shatter under physical force"
        },
        { 
            name: "Cave Spider", hp: 35, attack: 15, defense: 4, reward: 45, speed: 9, firstStrike: true, 
            description: "A massive spider with deadly venom", 
            minDepth: 0, maxDepth: 2,
            resistances: { physical: 1.0, magical: 1.3 }, // Very vulnerable to magic
            lore: "Natural creatures are extremely susceptible to magical attacks"
        },
        { 
            name: "Rabid Wolf", hp: 50, attack: 20, defense: 5, reward: 65, speed: 8, 
            description: "A savage wolf with foam-flecked jaws", 
            minDepth: 1, maxDepth: 4,
            resistances: { physical: 1.0, magical: 1.2 }, // Vulnerable to magic
            lore: "Wild beasts have no defense against supernatural forces"
        },
        
        // Mid Dungeon Enemies (Depths 2-6) - Punishing encounters
        { 
            name: "Orc Warrior", hp: 80, attack: 28, defense: 12, reward: 120, speed: 4, 
            description: "A fierce orc wielding a massive battle axe", 
            minDepth: 2, maxDepth: 6,
            resistances: { physical: 0.8, magical: 1.1 }, // Physically tough, magically vulnerable
            lore: "Heavily armored but with no magical protection"
        },
        { 
            name: "Shadow Beast", hp: 65, attack: 25, defense: 8, reward: 95, speed: 10, firstStrike: true, 
            description: "A creature of pure darkness that strikes without warning", 
            minDepth: 2, maxDepth: 7,
            resistances: { physical: 1.3, magical: 0.7 }, // Very resistant to physical, vulnerable to magic
            lore: "Shadow creatures are nearly immune to physical attacks but crumble before magical light"
        },
        { 
            name: "Undead Knight", hp: 95, attack: 30, defense: 15, reward: 140, speed: 2, 
            description: "A fallen knight in cursed armor, emanating cold death", 
            minDepth: 3, maxDepth: 7,
            resistances: { physical: 0.7, magical: 0.9 }, // Armored against both but weaker to physical crushing
            lore: "Heavy armor protects against magic, but concentrated force can shatter ancient metal"
        },
        { 
            name: "Poison Basilisk", hp: 70, attack: 26, defense: 10, reward: 110, speed: 5, 
            description: "A serpentine monster whose gaze brings paralysis", 
            minDepth: 3, maxDepth: 6,
            resistances: { physical: 1.0, magical: 1.2 }, // Natural creature, vulnerable to magic
            lore: "Reptilian hide offers little protection against supernatural forces"
        },
        { 
            name: "Minotaur", hp: 85, attack: 32, defense: 11, reward: 130, speed: 6, 
            description: "A bull-headed beast that charges with deadly fury", 
            minDepth: 4, maxDepth: 7,
            resistances: { physical: 0.8, magical: 1.3 }, // Tough hide, no magical defense
            lore: "Massive physical strength but completely vulnerable to magical attacks"
        },
        { 
            name: "Gargoyle", hp: 75, attack: 24, defense: 16, reward: 115, speed: 8, 
            description: "A stone creature that swoops from above with razor claws", 
            minDepth: 4, maxDepth: 6,
            resistances: { physical: 0.6, magical: 1.1 }, // Stone body resists physical, magic works better
            lore: "Stone skin deflects physical blows but magical energy penetrates deeply"
        },
        
        // Deep Dungeon Enemies (Depths 5-8) - Deadly threats
        { 
            name: "Fire Elemental", hp: 120, attack: 35, defense: 18, reward: 180, speed: 7, 
            description: "A raging inferno given form, burning everything in its path", 
            minDepth: 5, maxDepth: 8,
            resistances: { physical: 1.4, magical: 0.8 }, // Nearly immune to physical, weak to opposing magic
            lore: "Pure elemental fire laughs at physical weapons but succumbs to focused magical energy"
        },
        { 
            name: "Ice Troll", hp: 140, attack: 32, defense: 22, reward: 220, speed: 3, 
            description: "A massive troll encased in magical ice armor", 
            minDepth: 5, maxDepth: 9,
            resistances: { physical: 0.7, magical: 0.9 }, // Ice armor protects against both
            lore: "Magical ice provides superior protection, but can be shattered with enough force"
        },
        { 
            name: "Stone Golem", hp: 160, attack: 30, defense: 25, reward: 200, speed: 2, 
            description: "An unstoppable construct of animated granite", 
            minDepth: 6, maxDepth: 9,
            resistances: { physical: 0.5, magical: 1.0 }, // Nearly immune to physical, normal magical damage
            lore: "Enchanted stone construction makes it nearly impervious to physical damage"
        },
        { 
            name: "Wraith Lord", hp: 100, attack: 40, defense: 12, reward: 250, speed: 9, firstStrike: true, 
            description: "A spectral tyrant that drains the life from its victims", 
            minDepth: 6, maxDepth: 8,
            resistances: { physical: 1.5, magical: 0.6 }, // Incorporeal, very weak to magic
            lore: "Spectral form makes physical attacks nearly useless, but magic can bind and destroy spirits"
        },
        
        // Final Depths Enemies (Depths 7-10) - Boss-tier threats
        { 
            name: "Dark Sorcerer", hp: 130, attack: 45, defense: 15, reward: 300, speed: 5, 
            description: "A master of forbidden magic, crackling with dark power", 
            minDepth: 7, maxDepth: 10,
            resistances: { physical: 1.1, magical: 0.7 }, // Magically protected, vulnerable to opposing magic
            lore: "Dark magic shields protect against physical harm but create vulnerability to pure magical force"
        },
        { 
            name: "Ancient Dragon", hp: 200, attack: 50, defense: 28, reward: 400, speed: 7, firstStrike: true, 
            description: "A legendary wyrm whose breath can melt steel", 
            minDepth: 8, maxDepth: 10,
            resistances: { physical: 0.6, magical: 0.8 }, // Thick scales and ancient magic resistance
            lore: "Dragon scales deflect most attacks, but ancient magic provides some protection against spells"
        },
        { 
            name: "Demon Lord", hp: 250, attack: 55, defense: 30, reward: 500, speed: 6, 
            description: "An archfiend from the deepest circles of the abyss", 
            minDepth: 9, maxDepth: 10,
            resistances: { physical: 0.8, magical: 0.8 }, // Balanced high resistance to both
            lore: "Infernal power grants resistance to all mortal attacks, both physical and magical"
        },
        { 
            name: "Lich King", hp: 180, attack: 48, defense: 20, reward: 450, speed: 4, 
            description: "An undead archmage wielding necromantic powers", 
            minDepth: 8, maxDepth: 10,
            resistances: { physical: 1.2, magical: 0.6 }, // Undead body, vulnerable to opposing magic
            lore: "Undead flesh resists physical damage, but pure magical energy disrupts necromantic bindings"
        }
    ],
    
    // Item/treasure events (separated from progress events)
    itemEvents: [
        {
            text: "You find a healing potion in an old chest!",
            effect: function() {
                const healing = 20;
                gameState.character.heal(healing);
                return `You recover ${healing} HP!`;
            }
        },
        {
            text: "You discover a mana crystal glowing softly in the cave wall!",
            effect: function() {
                const manaGain = 15;
                gameState.character.restoreMana(manaGain);
                return `You gain ${manaGain} mana!`;
            }
        },
        {
            text: "A magical spring bubbles up from the ground!",
            effect: function() {
                gameState.character.heal(30);
                gameState.character.restoreMana(20);
                return "The spring fully refreshes you! +30 HP, +20 Mana!";
            }
        },
        {
            text: "You find ancient coins scattered on the ground!",
            effect: function() {
                const points = Math.floor(Math.random() * 30) + 20;
                gameState.addScore(points);
                return `You gain ${points} points!`;
            }
        },
        {
            text: "A hidden treasure cache reveals itself behind loose stones!",
            effect: function() {
                const points = Math.floor(Math.random() * 100) + 50;
                gameState.addScore(points);
                return `You find a valuable treasure worth ${points} points!`;
            }
        },
        {
            text: "You discover a merchant's lost purse filled with gems!",
            effect: function() {
                const points = Math.floor(Math.random() * 80) + 40;
                gameState.addScore(points);
                return `The gems are worth ${points} points!`;
            }
        },
        {
            text: "You stumble upon a training dummy and practice your combat skills!",
            effect: function() {
                gameState.character.strength += 1;
                gameState.character.agility += 1;
                UI.updateDisplay();
                return "Your strength and agility increase by 1!";
            }
        },
        {
            text: "An ancient tome of wisdom lies open on a stone pedestal!",
            effect: function() {
                gameState.character.maxMana += 5;
                gameState.character.mana = gameState.character.maxMana;
                gameState.character.agility += 2;
                UI.updateDisplay();
                return "Your magical knowledge grows! +5 Max Mana, +2 Agility!";
            }
        },
        {
            text: "You find an old warrior's training ground with practice weapons!",
            effect: function() {
                gameState.character.strength += 3;
                gameState.character.maxHp += 10;
                gameState.character.hp = Math.min(gameState.character.hp + 10, gameState.character.maxHp);
                UI.updateDisplay();
                return "Training makes you stronger! +3 Strength, +10 Max HP!";
            }
        },
        {
            text: "A glowing rune offers power, but at what cost?",
            effect: function() {
                if (Math.random() < 0.6) {
                    gameState.character.strength += 2;
                    gameState.character.agility += 2;
                    UI.updateDisplay();
                    return "The rune grants you power! +2 Strength, +2 Agility!";
                } else {
                    const damage = 15;
                    gameState.character.takeDamage(damage);
                    return `The rune's power is unstable! You take ${damage} damage!`;
                }
            }
        }
    ],
    
    // Choice-based events for strategic decision making
    choiceEvents: [
        {
            text: "The passage splits into two paths. To the left, you hear the sound of dripping water and see a faint blue glow. To the right, you feel a warm breeze and catch the scent of sulfur.",
            leftOption: "Follow the blue glow (left)",
            rightOption: "Follow the warm breeze (right)",
            leftOutcome: function() {
                const roll = Math.random();
                if (roll < 0.5) {
                    // Good outcome (50%)
                    gameState.character.heal(25);
                    gameState.character.restoreMana(20);
                    return "You discover an underground spring with healing properties! +25 HP, +20 Mana!";
                } else if (roll < 0.8) {
                    // Neutral outcome (30%)
                    gameState.addScore(30);
                    return "You find some glowing crystals worth modest treasure. +30 points!";
                } else {
                    // Bad outcome (20%)
                    const damage = 15;
                    gameState.character.takeDamage(damage);
                    return `The blue glow was from toxic fungus! The spores damage you for ${damage} HP!`;
                }
            },
            rightOutcome: function() {
                const roll = Math.random();
                if (roll < 0.4) {
                    // Good outcome (40%)
                    gameState.addScore(80);
                    gameState.character.strength += 2;
                    UI.updateDisplay();
                    return "You find a forge with enchanted weapons! +80 points, +2 Strength!";
                } else if (roll < 0.7) {
                    // Neutral outcome (30%)
                    gameState.addScore(50);
                    gameState.character.heal(10);
                    return "You discover a warm chamber with minor treasures. +50 points, +10 HP!";
                } else {
                    // Bad outcome (30%)
                    const damage = 20;
                    gameState.character.takeDamage(damage);
                    return `You walk into a fire trap! The flames burn you for ${damage} HP!`;
                }
            }
        },
        {
            text: "You reach a chamber with two doors. The left door is made of dark iron with strange symbols. The right door is wooden with scratch marks and sounds of movement beyond.",
            leftOption: "Enter the iron door (left)",
            rightOption: "Enter the wooden door (right)",
            leftOutcome: function() {
                const roll = Math.random();
                if (roll < 0.35) {
                    // Good outcome (35%)
                    gameState.character.maxMana += 15;
                    gameState.character.mana = gameState.character.maxMana;
                    gameState.addScore(100);
                    UI.updateDisplay();
                    return "An ancient wizard's study! You absorb magical knowledge! +15 Max Mana, +100 points!";
                } else if (roll < 0.65) {
                    // Neutral outcome (30%)
                    gameState.addScore(60);
                    gameState.character.agility += 1;
                    UI.updateDisplay();
                    return "You find a library with some useful tomes. +60 points, +1 Agility!";
                } else {
                    // Bad outcome (35%)
                    const damage = 25;
                    gameState.character.takeDamage(damage);
                    gameState.character.mana = Math.max(0, gameState.character.mana - 15);
                    UI.updateDisplay();
                    return `A cursed room drains your life force! -${damage} HP, -15 Mana!`;
                }
            },
            rightOutcome: function() {
                const roll = Math.random();
                if (roll < 0.45) {
                    // Good outcome (45%)
                    gameState.addScore(70);
                    gameState.character.agility += 3;
                    UI.updateDisplay();
                    return "You find a beast trainer's room with agility equipment! +70 points, +3 Agility!";
                } else if (roll < 0.75) {
                    // Neutral outcome (30%)
                    gameState.addScore(40);
                    gameState.character.strength += 1;
                    UI.updateDisplay();
                    return "You find some training equipment. +40 points, +1 Strength!";
                } else {
                    // Bad outcome (25%) - Force combat
                    const enemy = { name: "Caged Beast", hp: 90, attack: 35, defense: 8, reward: 150, speed: 10, firstStrike: true, description: "A starved and enraged beast" };
                    setTimeout(() => {
                        World.spawnSpecificEnemy(enemy);
                    }, 100);
                    return "A caged beast breaks free and attacks immediately!";
                }
            }
        },
        {
            text: "You discover a treasure vault with two chests. The gold chest gleams invitingly but sits on a pressure plate. The silver chest is smaller and appears safer.",
            leftOption: "Open the gold chest (risky)",
            rightOption: "Open the silver chest (safe)",
            leftOutcome: function() {
                const roll = Math.random();
                if (roll < 0.25) {
                    // Great outcome (25%)
                    gameState.addScore(250);
                    gameState.character.maxHp += 25;
                    gameState.character.heal(25);
                    UI.updateDisplay();
                    return "Incredible treasure! A legendary artifact! +250 points, +25 Max HP!";
                } else if (roll < 0.45) {
                    // Good outcome (20%)
                    gameState.addScore(120);
                    gameState.character.strength += 2;
                    gameState.character.agility += 1;
                    UI.updateDisplay();
                    return "Valuable enchanted gear! +120 points, +2 Strength, +1 Agility!";
                } else if (roll < 0.65) {
                    // Neutral outcome (20%)
                    gameState.addScore(80);
                    const damage = 10;
                    gameState.character.takeDamage(damage);
                    return `A minor trap triggered, but you grabbed the treasure! +80 points, -${damage} HP.`;
                } else {
                    // Bad outcome (35%)
                    const damage = 30;
                    gameState.character.takeDamage(damage);
                    gameState.addScore(20); // Small consolation
                    return `Dangerous trap! Poison darts hit you for ${damage} damage! You grab some coins (+20 points).`;
                }
            },
            rightOutcome: function() {
                const roll = Math.random();
                if (roll < 0.6) {
                    // Good outcome (60%)
                    const points = Math.floor(Math.random() * 40) + 50;
                    gameState.addScore(points);
                    gameState.character.heal(15);
                    return `A modest but safe reward. +${points} points, +15 HP!`;
                } else if (roll < 0.9) {
                    // Neutral outcome (30%)
                    const points = Math.floor(Math.random() * 30) + 30;
                    gameState.addScore(points);
                    return `Some coins and trinkets. +${points} points.`;
                } else {
                    // Bad outcome (10% - even "safe" choices have small risks)
                    gameState.addScore(20);
                    const damage = 5;
                    gameState.character.takeDamage(damage);
                    return `The chest was booby-trapped anyway! Minor damage: -${damage} HP, +20 points.`;
                }
            }
        },
        {
            text: "A mysterious merchant appears from the shadows. 'Trade your essence for power, or seek wisdom through sacrifice?' he whispers before pointing to two potions.",
            leftOption: "Drink red potion (power)",
            rightOption: "Drink blue potion (wisdom)",
            leftOutcome: function() {
                const roll = Math.random();
                if (roll < 0.4) {
                    // Good outcome (40%)
                    gameState.character.strength += 5;
                    gameState.combatSpecialization.physicalMastery += 3;
                    UI.updateDisplay();
                    return "Raw power surges through you! +5 Strength, +3 Physical Mastery!";
                } else if (roll < 0.7) {
                    // Neutral outcome (30%)
                    gameState.character.strength += 2;
                    const hpCost = 10;
                    gameState.character.takeDamage(hpCost);
                    UI.updateDisplay();
                    return `Painful transformation! +2 Strength, -${hpCost} HP.`;
                } else {
                    // Bad outcome (30%)
                    const hpCost = Math.floor(gameState.character.maxHp * 0.25);
                    gameState.character.takeDamage(hpCost);
                    gameState.character.strength += 1;
                    UI.updateDisplay();
                    return `The potion burns! You gain power but at great cost: -${hpCost} HP, +1 Strength.`;
                }
            },
            rightOutcome: function() {
                const roll = Math.random();
                if (roll < 0.45) {
                    // Good outcome (45%)
                    gameState.character.agility += 4;
                    gameState.character.maxMana += 10;
                    gameState.combatSpecialization.magicalMastery += 2;
                    UI.updateDisplay();
                    return "Your mind expands with arcane knowledge! +4 Agility, +10 Max Mana, +2 Magical Mastery!";
                } else if (roll < 0.75) {
                    // Neutral outcome (30%)
                    gameState.character.agility += 2;
                    gameState.character.maxMana += 5;
                    UI.updateDisplay();
                    return "Moderate enlightenment. +2 Agility, +5 Max Mana.";
                } else {
                    // Bad outcome (25%)
                    const manaCost = Math.floor(gameState.character.maxMana * 0.3);
                    gameState.character.maxMana = Math.max(20, gameState.character.maxMana - manaCost);
                    gameState.character.mana = Math.min(gameState.character.mana, gameState.character.maxMana);
                    gameState.character.agility += 1;
                    UI.updateDisplay();
                    return `The knowledge is too much for your mind! -${manaCost} Max Mana, +1 Agility.`;
                }
            }
        }
    ],
    
    // High-risk, high-reward events with proper probability distributions
    riskEvents: [
        {
            text: "You find a pulsing magical artifact. It radiates immense power but feels extremely dangerous to touch. The energy could transform you... or destroy you.",
            risk: "Touch the artifact (HIGH RISK - 25% success)",
            safe: "Leave it alone (safe)",
            riskOutcome: function() {
                const roll = Math.random();
                if (roll < 0.25) {
                    // Amazing reward (25% chance)
                    gameState.character.maxHp += 40;
                    gameState.character.maxMana += 30;
                    gameState.character.strength += 8;
                    gameState.character.agility += 8;
                    gameState.addScore(500);
                    UI.updateDisplay();
                    return "LEGENDARY TRANSFORMATION! The artifact reshapes your very essence! +40 Max HP, +30 Max Mana, +8 to all stats, +500 points!";
                } else {
                    // Severe punishment (75% chance)
                    const damage = Math.floor(gameState.character.maxHp * 0.5);
                    gameState.character.takeDamage(damage);
                    gameState.character.mana = Math.max(0, gameState.character.mana - 25);
                    return `The artifact explodes with chaotic energy! You take ${damage} damage and lose 25 Mana!`;
                }
            },
            safeOutcome: function() {
                const roll = Math.random();
                if (roll < 0.7) {
                    gameState.addScore(30);
                    return "You resist temptation and move on safely. Your wisdom is rewarded. +30 points.";
                } else {
                    gameState.addScore(10);
                    return "You leave the artifact, but feel you may have missed something important. +10 points.";
                }
            }
        },
        {
            text: "A demonic altar offers to trade your very soul for ultimate combat mastery. The power would be incredible, but the cost... final.",
            risk: "Make the blood pact (EXTREME RISK - 20% success)",
            safe: "Reject the offer (safe)",
            riskOutcome: function() {
                const roll = Math.random();
                if (roll < 0.20) {
                    // Incredible knowledge (20% chance)
                    gameState.combatSpecialization.physicalMastery += 10;
                    gameState.combatSpecialization.magicalMastery += 10;
                    gameState.character.agility += 15;
                    gameState.character.strength += 10;
                    gameState.addScore(800);
                    UI.updateDisplay();
                    return "FORBIDDEN MASTERY! Demonic power flows through you! +10 to both masteries, +15 Agility, +10 Strength, +800 points!";
                } else {
                    // Lose a life but gain some compensation (80% chance)
                    gameState.lives--;
                    if (gameState.lives <= 0) {
                        gameState.gameOver("death");
                        return "The demon claims your soul! GAME OVER!";
                    } else {
                        gameState.character.hp = Math.floor(gameState.character.maxHp * 0.2);
                        gameState.combatSpecialization.physicalMastery += 2;
                        gameState.combatSpecialization.magicalMastery += 2;
                        UI.updateDisplay();
                        return `The demon takes one of your lives! You have ${gameState.lives} lives remaining, but gain +2 to both masteries as consolation.`;
                    }
                }
            },
            safeOutcome: function() {
                const roll = Math.random();
                if (roll < 0.6) {
                    gameState.addScore(50);
                    gameState.character.heal(15);
                    return "You reject evil and feel spiritually cleansed. +50 points, +15 HP.";
                } else {
                    gameState.addScore(25);
                    gameState.character.heal(8);
                    return "You turn away from the altar, feeling slightly uneasy. +25 points, +8 HP.";
                }
            }
        },
        {
            text: "An ancient gambling demon appears, offering a game of chance. 'Bet your current power against unimaginable strength!' he cackles.",
            risk: "Accept the wager (VERY HIGH RISK - 30% success)",
            safe: "Decline the game (safe)",
            riskOutcome: function() {
                const roll = Math.random();
                if (roll < 0.30) {
                    // Great success (30% chance)
                    const strengthGain = Math.floor(gameState.character.strength * 0.8);
                    const agilityGain = Math.floor(gameState.character.agility * 0.6);
                    const hpGain = Math.floor(gameState.character.maxHp * 0.4);
                    
                    gameState.character.strength += strengthGain;
                    gameState.character.agility += agilityGain;
                    gameState.character.maxHp += hpGain;
                    gameState.character.heal(hpGain);
                    gameState.addScore(400);
                    UI.updateDisplay();
                    return `JACKPOT! The demon honors the wager! +${strengthGain} Strength, +${agilityGain} Agility, +${hpGain} Max HP, +400 points!`;
                } else {
                    // Major loss (70% chance)
                    const strengthLoss = Math.floor(gameState.character.strength * 0.4);
                    const agilityLoss = Math.floor(gameState.character.agility * 0.3);
                    const damage = Math.floor(gameState.character.maxHp * 0.3);
                    
                    gameState.character.strength = Math.max(5, gameState.character.strength - strengthLoss);
                    gameState.character.agility = Math.max(5, gameState.character.agility - agilityLoss);
                    gameState.character.takeDamage(damage);
                    UI.updateDisplay();
                    return `You lose! The demon takes his payment! -${strengthLoss} Strength, -${agilityLoss} Agility, -${damage} HP!`;
                }
            },
            safeOutcome: function() {
                const roll = Math.random();
                if (roll < 0.8) {
                    gameState.addScore(20);
                    return "You wisely avoid the demon's game. Sometimes the best bet is not to bet. +20 points.";
                } else {
                    gameState.addScore(40);
                    gameState.character.agility += 1;
                    UI.updateDisplay();
                    return "The demon respects your caution and grants a small boon. +40 points, +1 Agility.";
                }
            }
        },
        {
            text: "A crystalline pool reflects not your image, but your potential. 'Dive deep for greatness, or stay shallow in safety,' whispers the water itself.",
            risk: "Dive into the depths (HIGH RISK - 35% success)",
            safe: "Wade in the shallows (safe)",
            riskOutcome: function() {
                const roll = Math.random();
                if (roll < 0.35) {
                    // Excellent reward (35% chance)
                    gameState.character.maxMana += 25;
                    gameState.character.mana = gameState.character.maxMana;
                    gameState.combatSpecialization.magicalMastery += 5;
                    gameState.combatSpecialization.physicalMastery += 3;
                    gameState.addScore(300);
                    UI.updateDisplay();
                    return "DEEP ENLIGHTENMENT! The pool reveals hidden potential! +25 Max Mana, +5 Magical Mastery, +3 Physical Mastery, +300 points!";
                } else {
                    // Dangerous outcome (65% chance)
                    const damage = Math.floor(gameState.character.maxHp * 0.35);
                    const manaLoss = Math.floor(gameState.character.maxMana * 0.4);
                    gameState.character.takeDamage(damage);
                    gameState.character.maxMana = Math.max(20, gameState.character.maxMana - manaLoss);
                    gameState.character.mana = Math.min(gameState.character.mana, gameState.character.maxMana);
                    UI.updateDisplay();
                    return `The depths are treacherous! You nearly drown in visions! -${damage} HP, -${manaLoss} Max Mana!`;
                }
            },
            safeOutcome: function() {
                const roll = Math.random();
                if (roll < 0.75) {
                    gameState.character.heal(20);
                    gameState.character.restoreMana(15);
                    gameState.addScore(35);
                    return "The shallow waters are refreshing and safe. +20 HP, +15 Mana, +35 points.";
                } else {
                    gameState.character.heal(10);
                    gameState.addScore(15);
                    return "The waters are lukewarm and unremarkable. +10 HP, +15 points.";
                }
            }
        }
    ],
    
    // Progress events (separate category with mandatory rewards)
    progressEvents: [
        {
            text: "You find a hidden staircase leading deeper into the dungeon!",
            effect: function() {
                const depthGain = 1;
                const pointReward = 50;
                const hpReward = 20;
                
                // Cap depth at target depth to ensure final boss encounter
                gameState.dungeonDepth = Math.min(gameState.dungeonDepth + depthGain, gameState.targetDepth);
                gameState.addScore(pointReward);
                gameState.character.heal(hpReward);
                
                if (gameState.dungeonDepth >= gameState.targetDepth) {
                    return `You descend to depth ${gameState.dungeonDepth}! This feels like the final chamber... (+${pointReward} points, +${hpReward} HP)`;
                }
                return `You descend to depth ${gameState.dungeonDepth}/${gameState.targetDepth}! The air grows thicker with ancient magic... (+${pointReward} points, +${hpReward} HP)`;
            }
        },
        {
            text: "A mysterious map fragment reveals part of the dungeon layout!",
            effect: function() {
                const progress = Math.floor(Math.random() * 2) + 1;
                const pointReward = 40 * progress;
                const manaReward = 15;
                
                // Cap depth at target depth to ensure final boss encounter
                gameState.dungeonDepth = Math.min(gameState.dungeonDepth + progress, gameState.targetDepth);
                gameState.addScore(pointReward);
                gameState.character.restoreMana(manaReward);
                
                if (gameState.dungeonDepth >= gameState.targetDepth) {
                    return `The map leads you ${progress} levels deeper to depth ${gameState.dungeonDepth}! You sense the final chamber nearby! (+${pointReward} points, +${manaReward} Mana)`;
                }
                return `The map guides you ${progress} levels deeper to depth ${gameState.dungeonDepth}/${gameState.targetDepth}! (+${pointReward} points, +${manaReward} Mana)`;
            }
        },
        {
            text: "You discover a forgotten elevator shaft with working mechanisms!",
            effect: function() {
                const progress = 2;
                const pointReward = 75;
                const statBonus = 2;
                
                // Cap depth at target depth to ensure final boss encounter
                gameState.dungeonDepth = Math.min(gameState.dungeonDepth + progress, gameState.targetDepth);
                gameState.addScore(pointReward);
                gameState.character.strength += statBonus;
                gameState.character.agility += statBonus;
                UI.updateDisplay();
                
                if (gameState.dungeonDepth >= gameState.targetDepth) {
                    return `The elevator carries you ${progress} levels deeper to depth ${gameState.dungeonDepth}! The final chamber awaits! (+${pointReward} points, +${statBonus} to all stats)`;
                }
                return `The elevator carries you ${progress} levels deeper to depth ${gameState.dungeonDepth}/${gameState.targetDepth}! (+${pointReward} points, +${statBonus} to all stats)`;
            }
        },
        {
            text: "A magical portal shimmers before you, offering passage to lower levels!",
            effect: function() {
                const progress = Math.floor(Math.random() * 3) + 1;
                const pointReward = 60;
                const maxHpBonus = 15;
                const maxManaBonus = 10;
                
                // Cap depth at target depth to ensure final boss encounter
                gameState.dungeonDepth = Math.min(gameState.dungeonDepth + progress, gameState.targetDepth);
                gameState.addScore(pointReward);
                gameState.character.maxHp += maxHpBonus;
                gameState.character.maxMana += maxManaBonus;
                gameState.character.heal(maxHpBonus);
                gameState.character.restoreMana(maxManaBonus);
                UI.updateDisplay();
                
                if (gameState.dungeonDepth >= gameState.targetDepth) {
                    return `The portal transports you ${progress} levels deeper to depth ${gameState.dungeonDepth}! The final chamber calls to you! (+${pointReward} points, +${maxHpBonus} Max HP, +${maxManaBonus} Max Mana)`;
                }
                return `The portal transports you ${progress} levels deeper to depth ${gameState.dungeonDepth}/${gameState.targetDepth}! (+${pointReward} points, +${maxHpBonus} Max HP, +${maxManaBonus} Max Mana)`;
            }
        }
    ],
    
    getAvailableEnemies: function(dungeonDepth) {
        // Return enemies appropriate for current dungeon depth
        const availableEnemies = this.enemyTypes.filter(enemy => {
            return dungeonDepth >= enemy.minDepth && dungeonDepth <= enemy.maxDepth;
        });
        
        // Fallback to early enemies if no enemies match current depth
        return availableEnemies.length > 0 ? availableEnemies : this.enemyTypes.slice(0, 3);
    }
};

// ===============================================
// WORLD SYSTEM (Handles exploration, events, and world state)
// ===============================================
const World = {
    explore: function() {
        if (gameState.isGameOver || gameState.inCombat) return;
        
        // Increment turn counter for time limit tracking
        gameState.incrementTurn();
        
        // Check if game ended due to turn limit
        if (gameState.isGameOver) return;
        
        gameState.discoveries++;
        
        // Determine encounter type using balanced system
        const encounterType = this.determineEncounterType();
        
        switch (encounterType) {
            case 'combat':
                this.spawnEnemy();
                gameState.encounterHistory.combatsSinceProgress++;
                break;
            case 'item':
                this.triggerItemEvent();
                break;
            case 'progress':
                this.triggerProgressEvent();
                gameState.encounterHistory.combatsSinceProgress = 0;
                break;
            case 'choice':
                this.triggerChoiceEvent();
                break;
            case 'risk':
                this.triggerRiskEvent();
                break;
        }
        
        // Update encounter history for future balancing
        gameState.encounterHistory.lastEventType = encounterType;
    },
    
    determineEncounterType: function() {
        const history = gameState.encounterHistory;
        let weights = { ...history.eventWeights };
        
        // Reduce weight of last event type to prevent repetition
        if (history.lastEventType) {
            weights[history.lastEventType] *= history.repeatedTypeModifier;
        }
        
        // Prevent progress events if not enough combat encounters have occurred
        if (history.combatsSinceProgress < history.minCombatsBetweenProgress) {
            weights.progress = 0;
        }
        
        // Weighted random selection
        const totalWeight = weights.combat + weights.item + weights.progress + weights.choice + weights.risk;
        const random = Math.random() * totalWeight;
        
        if (random < weights.combat) return 'combat';
        if (random < weights.combat + weights.item) return 'item';
        if (random < weights.combat + weights.item + weights.progress) return 'progress';
        if (random < weights.combat + weights.item + weights.progress + weights.choice) return 'choice';
        return 'risk';
    },
    
    spawnEnemy: function() {
        // Use dungeon depth instead of player level for enemy selection
        const availableEnemies = GameData.getAvailableEnemies(gameState.dungeonDepth);
        const enemyData = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
        
        this.createEnemyInstance(enemyData);
    },
    
    spawnSpecificEnemy: function(enemyData) {
        // Force specific enemy encounter (used by choice events)
        this.createEnemyInstance(enemyData);
    },
    
    createEnemyInstance: function(enemyData) {
        // Create enemy instance with methods for self-contained behavior
        gameState.currentEnemy = {
            ...enemyData,
            maxHp: enemyData.hp,
            
            // Enemy methods (encapsulate enemy behavior)
            takeDamage: function(damage, damageType = 'physical', magicalVictory = false) {
                // Apply resistance multiplier based on damage type
                const resistance = this.resistances && this.resistances[damageType] ? this.resistances[damageType] : 1.0;
                const resistedDamage = damage * resistance;
                
                // Apply defense (after resistance calculation)
                const actualDamage = Math.max(resistedDamage - this.defense, 1);
                this.hp -= actualDamage;
                
                // Show resistance feedback
                let damageText = `You attack for ${Math.floor(actualDamage)} damage!`;
                if (resistance < 0.9) {
                    damageText += ` <span style="color: #4CAF50;">(Resisted!)</span>`;
                } else if (resistance > 1.1) {
                    damageText += ` <span style="color: #FF6B6B;">(Super Effective!)</span>`;
                }
                UI.addToLog(damageText, "combat");
                
                // Show lore explanation on first resistance encounter
                if (this.resistances && (resistance < 0.9 || resistance > 1.1) && !this.shownLore) {
                    UI.addToLog(`<i class="fas fa-book"></i> ${this.lore}`, "lore");
                    this.shownLore = true;
                }
                
                if (this.hp <= 0) {
                    // Different rewards based on victory type
                    if (magicalVictory) {
                        gameState.combatSpecialization.magicalMastery += 1;
                        UI.addToLog(`Magical mastery increased! Spell effectiveness improved.`, "victory");
                    } else {
                        gameState.combatSpecialization.physicalMastery += 1;
                        UI.addToLog(`Physical mastery increased! Attack accuracy improved.`, "victory");
                    }
                    
                    gameState.addScore(this.reward);
                    UI.addToLog(`${this.name} defeated! You gain ${this.reward} points!`, "victory");
                    UI.updateStory(`<i class="fas fa-trophy"></i> Victory! The ${this.name} falls before your might!`);
                    Combat.endBattle();
                } else {
                    // Enemy counter-attack (check for first strike)
                    setTimeout(() => Combat.enemyAttack(), 500);
                }
                
                UI.updateDisplay();
            },
            
            performAttack: function() {
                const enemyDamage = Math.floor(this.attack + Math.random() * 8);
                const actualDamage = Math.max(enemyDamage - Math.floor(gameState.character.agility / 4), 1);
                
                const playerDied = gameState.character.takeDamage(actualDamage);
                UI.addToLog(`${this.name} attacks you for ${actualDamage} damage!`, "damage");
                
                if (playerDied) {
                    gameState.playerDeath();
                }
            }
        };
        
        gameState.inCombat = true;
        
        // Check for first strike enemies
        const firstStrikeWarning = enemyData.firstStrike ? " ⚡ This enemy attacks first!" : "";
        UI.updateStory(`<i class="fas fa-swords"></i> Combat! You encounter a ${enemyData.name}! ${enemyData.description}${firstStrikeWarning}`);
        UI.addToLog(`A wild ${enemyData.name} appears!${firstStrikeWarning}`, "combat");
        
        // Handle first strike
        if (enemyData.firstStrike) {
            UI.addToLog(`The ${enemyData.name} strikes before you can react!`, "damage");
            setTimeout(() => {
                gameState.currentEnemy.performAttack();
                if (!gameState.isGameOver) {
                    UI.showCombatButtons();
                }
            }, 1000);
        } else {
            UI.showCombatButtons();
        }
        
        UI.updateDisplay();
    },
    
    triggerItemEvent: function() {
        const event = GameData.itemEvents[Math.floor(Math.random() * GameData.itemEvents.length)];
        const result = event.effect();
        
        UI.updateStory(`<i class="fas fa-search"></i> Discovery: ${event.text} ${result}`);
        UI.addToLog(`Discovery #${gameState.discoveries}: ${event.text} ${result}`, "event");
        gameState.addScore(10); // Small reward for exploring
    },
    
    triggerProgressEvent: function() {
        // Check if player has reached the final depth
        if (gameState.dungeonDepth >= gameState.targetDepth) {
            this.triggerFinalBoss();
            return;
        }
        
        const event = GameData.progressEvents[Math.floor(Math.random() * GameData.progressEvents.length)];
        const result = event.effect();
        
        UI.updateStory(`<i class="fas fa-map"></i> Major Discovery: ${event.text} ${result}`);
        UI.addToLog(`MAJOR DISCOVERY #${gameState.discoveries}: ${event.text} ${result}`, "progress");
    },
    
    triggerFinalBoss: function() {
        // Final boss encounter at maximum depth
        const finalBoss = {
            name: "The Dungeon Lord",
            hp: 320,        // Balanced for 6-8 turn fight
            maxHp: 320,     
            attack: 45,     // Reduced further to allow 12-15 survivable hits
            defense: 5,     // Very low defense, rely on resistance instead
            reward: 1000,
            speed: 8,
            firstStrike: true,
            description: "The ancient master of this cursed dungeon, wreathed in dark magic and wielding powers beyond mortal comprehension",
            resistances: { physical: 0.65, magical: 0.65 }, // Higher resistance but almost no defense
            lore: "The Dungeon Lord's ancient power grants resistance to all mortal attacks - only persistent assault can break his defenses",
            
            // Special boss abilities
            isAlive: function() { return this.hp > 0; },
            
            takeDamage: function(damage, damageType = 'physical', magicalVictory = false) {
                // Apply resistance multiplier based on damage type
                const resistance = this.resistances && this.resistances[damageType] ? this.resistances[damageType] : 1.0;
                const resistedDamage = damage * resistance;
                
                // Apply defense (after resistance calculation)
                const actualDamage = Math.max(resistedDamage - this.defense, 1);
                this.hp -= actualDamage;
                
                // Show resistance feedback for boss
                let damageText = `You strike the Dungeon Lord for ${Math.floor(actualDamage)} damage!`;
                if (resistance < 0.9) {
                    damageText += ` <span style="color: #4CAF50;">(Resisted!)</span>`;
                }
                UI.addToLog(damageText, "combat");
                
                // Show boss lore on first attack
                if (this.resistances && !this.shownLore) {
                    UI.addToLog(`<i class="fas fa-book"></i> ${this.lore}`, "lore");
                    this.shownLore = true;
                }
                
                if (this.hp <= 0) {
                    // Victory over final boss
                    gameState.finalBossDefeated = true; // Set the flag for proper victory
                    gameState.addScore(this.reward);
                    UI.addToLog(`THE DUNGEON LORD FALLS! You gain ${this.reward} points!`, "victory");
                    UI.updateStory(`<i class="fas fa-crown"></i> VICTORY! The Dungeon Lord crumbles to dust! You have conquered the depths and emerged as the ultimate champion!`);
                    gameState.gameOver("victory");
                } else {
                    // Boss special abilities at different health thresholds
                    if (this.hp <= 100 && !this.enraged) {
                        this.enraged = true;
                        this.attack += 20;
                        UI.addToLog(`The Dungeon Lord enters a berserker rage! Attack increased!`, "damage");
                    }
                    
                    // Boss counter-attack with potential special abilities
                    setTimeout(() => this.performSpecialAttack(), 500);
                }
                
                UI.updateDisplay();
            },
            
            performSpecialAttack: function() {
                const attackType = Math.random();
                
                if (attackType < 0.3) {
                    // Dark magic attack - ignores agility defense
                    const magicDamage = Math.floor(this.attack * 0.8 + Math.random() * 15);
                    const playerDied = gameState.character.takeDamage(magicDamage);
                    UI.addToLog(`The Dungeon Lord unleashes DARK MAGIC for ${magicDamage} damage! (Ignores agility)`, "damage");
                    if (playerDied) gameState.playerDeath();
                } else if (attackType < 0.6) {
                    // Life drain attack - heals boss while damaging player
                    const drainDamage = Math.floor(this.attack * 0.6 + Math.random() * 10);
                    const actualDamage = Math.max(drainDamage - Math.floor(gameState.character.agility / 4), 1);
                    const playerDied = gameState.character.takeDamage(actualDamage);
                    this.hp = Math.min(this.hp + Math.floor(actualDamage / 2), this.maxHp);
                    UI.addToLog(`The Dungeon Lord drains your life force! ${actualDamage} damage dealt, boss heals ${Math.floor(actualDamage / 2)}!`, "damage");
                    if (playerDied) gameState.playerDeath();
                } else {
                    // Normal attack
                    const enemyDamage = Math.floor(this.attack + Math.random() * 12);
                    const actualDamage = Math.max(enemyDamage - Math.floor(gameState.character.agility / 4), 1);
                    const playerDied = gameState.character.takeDamage(actualDamage);
                    UI.addToLog(`The Dungeon Lord attacks with crushing force for ${actualDamage} damage!`, "damage");
                    if (playerDied) gameState.playerDeath();
                }
            },
            
            performAttack: function() {
                this.performSpecialAttack();
            }
        };
        
        gameState.currentEnemy = finalBoss;
        gameState.inCombat = true;
        
        UI.updateStory(`<i class="fas fa-skull"></i> FINAL BOSS! You have reached the heart of the dungeon! The Dungeon Lord rises from his throne, dark energy crackling around his form! ⚡ He strikes first!`);
        UI.addToLog(`THE FINAL CONFRONTATION! The Dungeon Lord appears!`, "combat");
        
        // Boss always gets first strike
        setTimeout(() => {
            finalBoss.performSpecialAttack();
            if (!gameState.isGameOver) {
                UI.showCombatButtons();
            }
        }, 1500);
        
        UI.updateDisplay();
    },
    
    triggerChoiceEvent: function() {
        const event = GameData.choiceEvents[Math.floor(Math.random() * GameData.choiceEvents.length)];
        
        UI.updateStory(`<i class="fas fa-crossroads"></i> Choice: ${event.text}`);
        UI.addToLog(`CHOICE EVENT: ${event.text}`, "event");
        
        // Show choice buttons
        UI.showChoiceButtons(event.leftOption, event.rightOption, event.leftOutcome, event.rightOutcome);
    },
    
    triggerRiskEvent: function() {
        const event = GameData.riskEvents[Math.floor(Math.random() * GameData.riskEvents.length)];
        
        UI.updateStory(`<i class="fas fa-exclamation-triangle"></i> Risk vs Reward: ${event.text}`);
        UI.addToLog(`HIGH RISK EVENT: ${event.text}`, "event");
        
        // Show risk/safe buttons
        UI.showRiskButtons(event.risk, event.safe, event.riskOutcome, event.safeOutcome);
    }
};

// ===============================================
// COMBAT SYSTEM (Manages all combat interactions)
// ===============================================
const Combat = {
    playerAttack: function() {
        if (!gameState.inCombat || !gameState.currentEnemy) return;
        
        // Calculate player damage with mastery bonus (slightly increased for boss viability)
        const baseDamage = gameState.character.strength;
        const masteryBonus = gameState.combatSpecialization.physicalMastery * 1.5; // Increased from 1
        const damage = Math.floor(baseDamage + masteryBonus + Math.random() * 10);
        
        // Apply damage through enemy's takeDamage method (physical damage type)
        gameState.currentEnemy.takeDamage(damage, 'physical', false);
    },
    
    playerCastSpell: function() {
        if (!gameState.inCombat || !gameState.currentEnemy) return;
        
        // Check mana cost before casting
        if (!gameState.character.consumeMana(15)) {
            UI.addToLog("Not enough mana to cast spell! (Requires 15 mana)", "error");
            return;
        }
        
        // Calculate spell damage with magical mastery bonus (balanced for boss fight)
        const baseSpellDamage = Math.floor(gameState.character.agility * 1.5);
        const masteryBonus = gameState.combatSpecialization.magicalMastery * 2; // Increased from 1.5
        const totalDamage = baseSpellDamage + masteryBonus + Math.random() * 15;
        UI.addToLog(`<i class="fas fa-magic"></i> You cast a magic spell!`, "combat");
        
        // Apply magical damage with resistance calculation
        gameState.currentEnemy.takeDamage(totalDamage, 'magical', true);
        
        // Note: Victory handling is now done in the enemy's takeDamage method
        UI.updateDisplay();
    },
    
    attemptEscape: function() {
        if (!gameState.inCombat) return;
        
        // Agility affects escape chance - fast characters can run better
        const escapeChance = gameState.character.agility / 100 + 0.5;
        if (Math.random() < escapeChance) {
            UI.addToLog("You successfully escaped!", "escape");
            UI.updateStory("🏃 You manage to escape from the enemy! You live to fight another day.");
            this.endBattle();
        } else {
            UI.addToLog("Failed to escape! The enemy blocks your path!", "error");
            this.enemyAttack();
        }
        
        UI.updateDisplay();
    },
    
    enemyAttack: function() {
        if (!gameState.currentEnemy || !gameState.inCombat) return;
        gameState.currentEnemy.performAttack();
    },
    
    endBattle: function() {
        gameState.inCombat = false;
        gameState.currentEnemy = null;
        UI.showExplorationButtons();
    }
};

// ===============================================
// USER INTERFACE SYSTEM (Centralizes all UI operations)
// ===============================================
const UI = {
    elements: {}, // Cache for DOM elements to improve performance
    
    initialize: function() {
        // Cache DOM elements to avoid repeated getElementById calls
        this.elements = {
            score: document.getElementById('score'),
            level: document.getElementById('level'),
            lives: document.getElementById('lives'),
            turnCounter: document.getElementById('turn-counter'),
            depthDisplay: document.getElementById('depth-display'),
            playerHp: document.getElementById('player-hp'),
            playerMaxHp: document.getElementById('player-max-hp'),
            playerMana: document.getElementById('player-mana'),
            playerMaxMana: document.getElementById('player-max-mana'),
            playerStrength: document.getElementById('player-strength'),
            playerAgility: document.getElementById('player-agility'),
            physicalMastery: document.getElementById('physical-mastery'),
            magicalMastery: document.getElementById('magical-mastery'),
            playerHpBar: document.getElementById('player-hp-bar'),
            playerManaBar: document.getElementById('player-mana-bar'),
            enemyPanel: document.getElementById('enemy-panel'),
            enemyName: document.getElementById('enemy-name'),
            enemyHp: document.getElementById('enemy-hp'),
            enemyMaxHp: document.getElementById('enemy-max-hp'),
            enemyAttack: document.getElementById('enemy-attack'),
            enemyDefense: document.getElementById('enemy-defense'),
            enemyHpBar: document.getElementById('enemy-hp-bar'),
            gameStory: document.getElementById('game-story'),
            gameLog: document.getElementById('game-log'),
            exploreBtn: document.getElementById('explore-btn'),
            restBtn: document.getElementById('rest-btn'),
            shopBtn: document.getElementById('shop-btn'),
            attackBtn: document.getElementById('attack-btn'),
            spellBtn: document.getElementById('spell-btn'),
            runBtn: document.getElementById('run-btn')
        };
        
        this.updateDisplay();
        this.showExplorationButtons();
        this.addToLog("Welcome to Adventure Quest! Click 'Start New Game' to begin your journey!", "start");
    },
    
    updateDisplay: function() {
        // Update game stats display
        this.elements.score.textContent = gameState.score;
        this.elements.level.textContent = gameState.level;
        this.elements.lives.textContent = gameState.lives;
        
        // Update turn counter with color coding based on time remaining
        if (this.elements.turnCounter) {
            this.elements.turnCounter.textContent = gameState.turnCounter;
            const turnsRemaining = gameState.maxTurns - gameState.turnCounter;
            const turnCounterElement = document.getElementById('turn-counter');
            if (turnCounterElement) {
                if (turnsRemaining <= 15) {
                    turnCounterElement.style.color = '#ff4444'; // Red for danger
                } else if (turnsRemaining <= 35) {
                    turnCounterElement.style.color = '#ffaa00'; // Orange for warning
                } else {
                    turnCounterElement.style.color = '#ffffff'; // White for normal
                }
            }
        }
        
        // Update depth display with color coding based on progress
        if (this.elements.depthDisplay) {
            this.elements.depthDisplay.textContent = gameState.dungeonDepth;
            const depthElement = document.getElementById('depth-display');
            if (depthElement) {
                const depthProgress = gameState.dungeonDepth / gameState.targetDepth;
                if (depthProgress >= 0.8) {
                    depthElement.style.color = '#00ff44'; // Green for near victory
                } else if (depthProgress >= 0.5) {
                    depthElement.style.color = '#ffaa00'; // Orange for good progress
                } else {
                    depthElement.style.color = '#ffffff'; // White for early game
                }
            }
        }
        
        // Update player stats display
        this.elements.playerHp.textContent = gameState.character.hp;
        this.elements.playerMaxHp.textContent = gameState.character.maxHp;
        this.elements.playerMana.textContent = gameState.character.mana;
        this.elements.playerMaxMana.textContent = gameState.character.maxMana;
        this.elements.playerStrength.textContent = gameState.character.strength;
        this.elements.playerAgility.textContent = gameState.character.agility;
        
        // Update mastery displays
        if (this.elements.physicalMastery) {
            this.elements.physicalMastery.textContent = gameState.combatSpecialization.physicalMastery;
        }
        if (this.elements.magicalMastery) {
            this.elements.magicalMastery.textContent = gameState.combatSpecialization.magicalMastery;
        }
        
        // Update visual progress bars for better user feedback
        const hpPercent = (gameState.character.hp / gameState.character.maxHp) * 100;
        const manaPercent = (gameState.character.mana / gameState.character.maxMana) * 100;
        this.elements.playerHpBar.style.width = `${hpPercent}%`;
        this.elements.playerManaBar.style.width = `${manaPercent}%`;
        
        // Update enemy panel only when in combat
        if (gameState.inCombat && gameState.currentEnemy) {
            this.elements.enemyPanel.style.display = 'block';
            this.elements.enemyName.textContent = gameState.currentEnemy.name;
            this.elements.enemyHp.textContent = Math.max(0, gameState.currentEnemy.hp);
            this.elements.enemyMaxHp.textContent = gameState.currentEnemy.maxHp;
            this.elements.enemyAttack.textContent = gameState.currentEnemy.attack;
            this.elements.enemyDefense.textContent = gameState.currentEnemy.defense;
            
            const enemyHpPercent = Math.max(0, (gameState.currentEnemy.hp / gameState.currentEnemy.maxHp) * 100);
            this.elements.enemyHpBar.style.width = `${enemyHpPercent}%`;
        } else {
            this.elements.enemyPanel.style.display = 'none';
        }
    },
    
    updateStory: function(text) {
        this.elements.gameStory.innerHTML = `<h3><i class="fas fa-book-open"></i> Current Situation</h3><p>${text}</p>`;
    },
    
    addToLog: function(message, type = 'normal') {
        const timestamp = new Date().toLocaleTimeString();
        let colorClass = this.getLogColorClass(type);
        
        // Create and append log entry with timestamp for better debugging
        const entry = document.createElement('p');
        entry.innerHTML = `<span style="color: #888;">[${timestamp}]</span> <span style="${colorClass}">${message}</span>`;
        this.elements.gameLog.appendChild(entry);
        this.elements.gameLog.scrollTop = this.elements.gameLog.scrollHeight;
    },
    
    getLogColorClass: function(type) {
        // Color-coded messages for better visual feedback
        const colors = {
            'combat': 'color: #ff6b6b;',
            'victory': 'color: #51cf66;',
            'damage': 'color: #ff8cc8;',
            'score': 'color: #74c0fc;',
            'levelup': 'color: #ffd43b;',
            'event': 'color: #d0bfff;',
            'rest': 'color: #8ce99a;',
            'escape': 'color: #a9e34b;',
            'death': 'color: #ff6b6b;',
            'gameover': 'color: #ff6b6b; font-weight: bold;',
            'start': 'color: #69db7c; font-weight: bold;',
            'error': 'color: #ffa8a8;'
        };
        return colors[type] || '';
    },
    
    showExplorationButtons: function() {
        // Show exploration UI when not in combat
        this.elements.exploreBtn.classList.remove('hidden');
        this.elements.restBtn.classList.remove('hidden');
        this.elements.shopBtn.classList.remove('hidden');
        this.elements.attackBtn.classList.add('hidden');
        this.elements.spellBtn.classList.add('hidden');
        this.elements.runBtn.classList.add('hidden');
    },
    
    showCombatButtons: function() {
        // Show combat UI when in battle
        this.elements.exploreBtn.classList.add('hidden');
        this.elements.restBtn.classList.add('hidden');
        this.elements.shopBtn.classList.add('hidden');
        this.elements.attackBtn.classList.remove('hidden');
        this.elements.spellBtn.classList.remove('hidden');
        this.elements.runBtn.classList.remove('hidden');
    },
    
    showChoiceButtons: function(leftOption, rightOption, leftOutcome, rightOutcome) {
        // Hide normal buttons and create choice buttons
        this.hideAllActionButtons();
        
        // Create temporary choice buttons
        const leftBtn = document.createElement('button');
        leftBtn.textContent = leftOption;
        leftBtn.className = 'btn choice-btn left-choice';
        leftBtn.onclick = () => {
            const result = leftOutcome();
            UI.addToLog(`Choice made: ${result}`, "event");
            UI.updateStory(`<i class="fas fa-arrow-left"></i> ${result}`);
            UI.removeChoiceButtons();
            // Don't show exploration buttons if combat started
            if (!gameState.inCombat && !gameState.isGameOver) {
                UI.showExplorationButtons();
            }
            UI.updateDisplay();
        };
        
        const rightBtn = document.createElement('button');
        rightBtn.textContent = rightOption;
        rightBtn.className = 'btn choice-btn right-choice';
        rightBtn.onclick = () => {
            const result = rightOutcome();
            UI.addToLog(`Choice made: ${result}`, "event");
            UI.updateStory(`<i class="fas fa-arrow-right"></i> ${result}`);
            UI.removeChoiceButtons();
            // Don't show exploration buttons if combat started
            if (!gameState.inCombat && !gameState.isGameOver) {
                UI.showExplorationButtons();
            }
            UI.updateDisplay();
        };
        
        const actionsDiv = document.querySelector('.controls');
        actionsDiv.appendChild(leftBtn);
        actionsDiv.appendChild(rightBtn);
    },
    
    showRiskButtons: function(riskOption, safeOption, riskOutcome, safeOutcome) {
        // Hide normal buttons and create risk buttons
        this.hideAllActionButtons();
        
        // Create temporary risk buttons
        const riskBtn = document.createElement('button');
        riskBtn.textContent = riskOption;
        riskBtn.className = 'btn risk-btn dangerous';
        riskBtn.onclick = () => {
            const result = riskOutcome();
            UI.addToLog(`Risky choice: ${result}`, "event");
            UI.updateStory(`<i class="fas fa-dice"></i> ${result}`);
            UI.removeChoiceButtons();
            if (!gameState.isGameOver) {
                UI.showExplorationButtons();
            }
            UI.updateDisplay();
        };
        
        const safeBtn = document.createElement('button');
        safeBtn.textContent = safeOption;
        safeBtn.className = 'btn risk-btn safe';
        safeBtn.onclick = () => {
            const result = safeOutcome();
            UI.addToLog(`Safe choice: ${result}`, "event");
            UI.updateStory(`<i class="fas fa-shield"></i> ${result}`);
            UI.removeChoiceButtons();
            UI.showExplorationButtons();
            UI.updateDisplay();
        };
        
        const actionsDiv = document.querySelector('.controls');
        actionsDiv.appendChild(riskBtn);
        actionsDiv.appendChild(safeBtn);
    },
    
    removeChoiceButtons: function() {
        // Remove any temporary choice/risk buttons
        document.querySelectorAll('.choice-btn, .risk-btn').forEach(btn => btn.remove());
    },
    
    showVictoryShareButton: function() {
        // Create a special share button for victory
        const shareBtn = document.createElement('button');
        shareBtn.textContent = '🎉 Share Your Victory!';
        shareBtn.className = 'btn victory-share-btn';
        shareBtn.onclick = () => {
            this.shareVictory();
        };
        
        const controlsDiv = document.querySelector('.controls');
        controlsDiv.appendChild(shareBtn);
    },
    
    shareVictory: function() {
        const shareText = `🏆 I just conquered the Dungeon Lord! 🏆\n\n` +
                         `📊 Final Score: ${gameState.score} points\n` +
                         `⏱️ Completed in: ${gameState.turnCounter} turns\n` +
                         `🎮 Dungeon Depths RPG\n\n` +
                         `Think you can beat my time? 😉`;
        
        // Try to use the modern Web Share API if available
        if (navigator.share) {
            navigator.share({
                title: 'Dungeon Depths Victory!',
                text: shareText,
                url: window.location.href
            }).then(() => {
                UI.addToLog("Victory shared successfully! 🎉", "victory");
            }).catch(() => {
                // Fallback if share is cancelled
                this.fallbackShare(shareText);
            });
        } else {
            // Fallback for browsers without Web Share API
            this.fallbackShare(shareText);
        }
    },
    
    fallbackShare: function(shareText) {
        // Copy to clipboard as fallback
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareText).then(() => {
                UI.addToLog("Victory stats copied to clipboard! 📋", "victory");
                UI.addToLog("Paste anywhere to share your achievement! 🎊", "victory");
            }).catch(() => {
                // Final fallback - show text in a popup
                this.showSharePopup(shareText);
            });
        } else {
            // Final fallback for older browsers
            this.showSharePopup(shareText);
        }
    },
    
    showSharePopup: function(shareText) {
        // Create a popup with the shareable text
        alert(`Victory Achievement Unlocked!\n\n${shareText}\n\nCopy this text to share your victory!`);
        UI.addToLog("Share your victory with friends! 🏆", "victory");
    },
    
    hideAllActionButtons: function() {
        // Hide all action buttons (for game over states)
        this.elements.exploreBtn.classList.add('hidden');
        this.elements.restBtn.classList.add('hidden');
        this.elements.shopBtn.classList.add('hidden');
        this.elements.attackBtn.classList.add('hidden');
        this.elements.spellBtn.classList.add('hidden');
        this.elements.runBtn.classList.add('hidden');
        
        // Also remove any temporary buttons
        this.removeChoiceButtons();
        document.querySelectorAll('.victory-share-btn').forEach(btn => btn.remove());
    }
};

// ===============================================
// SHOP SYSTEM (Handles upgrade purchases)
// ===============================================
const Shop = {
    upgrades: {
        health: { cost: 250, benefit: "+15 Max HP", icon: "fas fa-heart", baseCost: 250 },
        mana: { cost: 200, benefit: "+10 Max Mana", icon: "fas fa-magic", baseCost: 200 },
        strength: { cost: 150, benefit: "+2 Strength", icon: "fas fa-fist-raised", baseCost: 150 },
        agility: { cost: 150, benefit: "+2 Agility", icon: "fas fa-wind", baseCost: 150 },
        mastery: { cost: 300, benefit: "+1 to both masteries", icon: "fas fa-shield-alt", baseCost: 300 },
        life: { cost: 800, benefit: "+1 Life (Max 5)", icon: "fas fa-heart-broken", baseCost: 800 }
    },
    
    openShop: function() {
        if (gameState.inCombat) {
            UI.addToLog("Cannot access shop during combat!", "damage");
            return;
        }
        
        document.getElementById('shop-panel').style.display = 'block';
        this.updateShopDisplay();
        UI.addToLog("Welcome to the Mystical Shop! Spend your points wisely.", "event");
    },
    
    closeShop: function() {
        document.getElementById('shop-panel').style.display = 'none';
        UI.addToLog("You leave the mystical shop.", "event");
    },
    
    updateShopDisplay: function() {
        // Update shop button states based on available points
        for (const [upgradeType, upgrade] of Object.entries(this.upgrades)) {
            const button = document.getElementById(`shop-${upgradeType}`);
            const canAfford = gameState.score >= upgrade.cost;
            const isMaxedOut = this.isUpgradeMaxedOut(upgradeType);
            
            if (isMaxedOut) {
                button.textContent = "MAXED";
                button.disabled = true;
            } else if (!canAfford) {
                button.textContent = "Too Expensive";
                button.disabled = true;
            } else {
                button.textContent = "Buy";
                button.disabled = false;
            }
        }
    },
    
    isUpgradeMaxedOut: function(upgradeType) {
        switch (upgradeType) {
            case 'life':
                return gameState.lives >= 5;
            case 'health':
                return gameState.character.maxHp >= gameState.character.maxMaxHp;
            case 'mana':
                return gameState.character.maxMana >= gameState.character.maxMaxMana;
            case 'strength':
                return gameState.character.strength >= gameState.character.maxStrength;
            case 'agility':
                return gameState.character.agility >= gameState.character.maxAgility;
            case 'mastery':
                return gameState.combatSpecialization.physicalMastery >= gameState.combatSpecialization.maxPhysicalMastery &&
                       gameState.combatSpecialization.magicalMastery >= gameState.combatSpecialization.maxMagicalMastery;
            default:
                return false;
        }
    },
    
    buyUpgrade: function(upgradeType) {
        const upgrade = this.upgrades[upgradeType];
        
        if (gameState.score < upgrade.cost) {
            UI.addToLog("Not enough points for this upgrade!", "damage");
            return;
        }
        
        if (this.isUpgradeMaxedOut(upgradeType)) {
            UI.addToLog("This upgrade is already at maximum!", "damage");
            return;
        }
        
        // Deduct cost
        gameState.score -= upgrade.cost;
        
        // Apply upgrade with stat caps enforced
        switch (upgradeType) {
            case 'health':
                const healthIncrease = Math.min(15, gameState.character.maxMaxHp - gameState.character.maxHp);
                if (healthIncrease > 0) {
                    gameState.character.maxHp += healthIncrease;
                    gameState.character.heal(healthIncrease);
                    UI.addToLog(`Health increased! +${healthIncrease} Max HP (and healed to full)`, "victory");
                } else {
                    UI.addToLog("Health is already at maximum!", "damage");
                    gameState.score += upgrade.cost; // Refund
                    return;
                }
                break;
                
            case 'mana':
                const manaIncrease = Math.min(10, gameState.character.maxMaxMana - gameState.character.maxMana);
                if (manaIncrease > 0) {
                    gameState.character.maxMana += manaIncrease;
                    gameState.character.restoreMana(manaIncrease);
                    UI.addToLog(`Mana increased! +${manaIncrease} Max Mana (and restored to full)`, "victory");
                } else {
                    UI.addToLog("Mana is already at maximum!", "damage");
                    gameState.score += upgrade.cost; // Refund
                    return;
                }
                break;
                
            case 'strength':
                const strengthIncrease = Math.min(2, gameState.character.maxStrength - gameState.character.strength);
                if (strengthIncrease > 0) {
                    gameState.character.strength += strengthIncrease;
                    UI.addToLog(`Strength training complete! +${strengthIncrease} Strength`, "victory");
                } else {
                    UI.addToLog("Strength is already at maximum!", "damage");
                    gameState.score += upgrade.cost; // Refund
                    return;
                }
                break;
                
            case 'agility':
                const agilityIncrease = Math.min(2, gameState.character.maxAgility - gameState.character.agility);
                if (agilityIncrease > 0) {
                    gameState.character.agility += agilityIncrease;
                    UI.addToLog(`Agility training complete! +${agilityIncrease} Agility`, "victory");
                } else {
                    UI.addToLog("Agility is already at maximum!", "damage");
                    gameState.score += upgrade.cost; // Refund
                    return;
                }
                break;
                
            case 'mastery':
                const physicalIncrease = Math.min(1, gameState.combatSpecialization.maxPhysicalMastery - gameState.combatSpecialization.physicalMastery);
                const magicalIncrease = Math.min(1, gameState.combatSpecialization.maxMagicalMastery - gameState.combatSpecialization.magicalMastery);
                
                if (physicalIncrease > 0 || magicalIncrease > 0) {
                    gameState.combatSpecialization.physicalMastery += physicalIncrease;
                    gameState.combatSpecialization.magicalMastery += magicalIncrease;
                    UI.addToLog(`Combat mastery enhanced! +${physicalIncrease} Physical, +${magicalIncrease} Magical Mastery`, "victory");
                } else {
                    UI.addToLog("Combat mastery is already at maximum!", "damage");
                    gameState.score += upgrade.cost; // Refund
                    return;
                }
                break;
                
            case 'life':
                if (gameState.lives < 5) {
                    gameState.lives++;
                    UI.addToLog("Extra life granted! You feel more resilient.", "victory");
                } else {
                    UI.addToLog("You already have maximum lives!", "damage");
                    gameState.score += upgrade.cost; // Refund
                    return;
                }
                break;
        }
        
        // Increase cost for next purchase (scaling difficulty)
        upgrade.cost = Math.floor(upgrade.cost * 1.4);
        
        UI.updateDisplay();
        this.updateShopDisplay();
        UI.addToLog(`Purchase complete! Remaining points: ${gameState.score}`, "event");
    }
};

// ===============================================
// GAME CONTROLLER (Handles input and coordinates between systems)
// ===============================================
const GameController = {
    startNewGame: function() {
        gameState.reset();
        UI.updateDisplay();
        UI.updateStory("<i class=\"fas fa-play\"></i> Game Reset! Your adventure begins anew. The dungeon awaits...");
        UI.addToLog("Game started! Your character has been fully restored.", "start");
        UI.showExplorationButtons();
    },
    
    exploreDungeon: function() {
        World.explore();
    },
    
    restAtCamp: function() {
        if (gameState.inCombat) {
            UI.addToLog("You cannot rest during combat!", "error");
            return;
        }
        
        // Increment turn counter - resting takes time
        gameState.incrementTurn();
        
        // Check if game ended due to turn limit
        if (gameState.isGameOver) return;
        
        const restResult = gameState.character.rest();
        UI.updateStory("<i class=\"fas fa-bed\"></i> You rest at your camp, recovering strength and mana...");
        UI.addToLog(`Resting... Recovered ${restResult.hpRestore} HP and ${restResult.manaRestore} mana.`, "rest");
    },
    
    attackEnemy: function() {
        Combat.playerAttack();
    },
    
    castSpell: function() {
        Combat.playerCastSpell();
    },
    
    runAway: function() {
        Combat.attemptEscape();
    }
};

// ===============================================
// GLOBAL FUNCTIONS (Interface for HTML button clicks)
// ===============================================
function startNewGame() {
    GameController.startNewGame();
}

function exploreDungeon() {
    GameController.exploreDungeon();
}

function restAtCamp() {
    GameController.restAtCamp();
}

function attackEnemy() {
    GameController.attackEnemy();
}

function castSpell() {
    GameController.castSpell();
}

function runAway() {
    GameController.runAway();
}

// ===============================================
// GAME INITIALIZATION (Sets up all systems when page loads)
// ===============================================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all systems in proper order
    UI.initialize();
    
    // Game is ready to play
    console.log("Adventure Quest initialized successfully!");
});