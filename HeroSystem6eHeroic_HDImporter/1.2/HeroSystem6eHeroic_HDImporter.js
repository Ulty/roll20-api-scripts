/* HeroSystem6eHeroic_HDImporter.js
 * Hero Designer Importer for the Roll20 Hero System 6e Heroic character sheet
 * Version: 1.2
 * By Villain in Glasses
 * villaininglasses@icloud.com
 * Discord: Villain#0604
 * Roll20: https://app.roll20.net/users/633423/villain-in-glasses
 * Hero Games Forum Thread: 
 * https://www.herogames.com/forums/topic/101627-new-roll20-character-sheet-hero-system-6e-heroic/
 *
 * Purpose: Imports characters created in Hero Designer into a Roll20 HeroSystem6eHeroic campaign.
 *
 * Installation: Paste this script into the API setup area of your Roll20 HeroSystem6eHeroic campaign.
 *
 * Copy "HeroSystem6eHeroic.hde" into your Hero Designer export format folder.
 *
 * Use: from Hero Designer export a character using HeroSystem6eHeroic.hde as the selected format. 
 * This will produce a text file with the name of the character (e.g., myCharacter.txt).
 *
 * Open the exported file in your favorite text editor. Select all of the contents and copy it.
 * Paste the copied text in the chat window of your Roll20 HeroSystem6eHeroic campaign. Hit enter.
 *
 * Commands:
 *   Import character: "!hero --import {character text}"
 *   Help: "!hero --help"
 *   Config: "!hero --config"
 * 
 * Based on BeyondImporter Version O.4.0 by 
 * Robin Kuiper
 * Discord: Atheos#1095
 * Roll20: https://app.roll20.net/users/1226016/robin
 *
 * Matt DeKok
 * Discord: Sillvva#2532
 * Roll20: https://app.roll20.net/users/494585/sillvva
 *
 * Ammo Goettsch
 * Discord: ammo#7063
 * Roll20: https://app.roll20.net/users/2990964/ammo
 */

(function() {
	// Constants
	const versionMod = "1.2";
	const versionSheet = "2.82"; // Note that a newer sheet will make upgrades as well as it can.
	const needsExportedVersion = new Set(["1.0", "1.2"]);
	
	const defaultAttributes = {
		
		// Bio
		character_title: "hero",
		backgroundText: "",
		historyText: "",
		experience: 0,
		money: 0,		
				
		// Tally Bar
		characteristicsCost: 0,
		
		// Primary Attributes
		strength: 10,
		dexterity: 10,
		constitution: 10,
		intelligence: 10,
		ego: 10,
		presence:10,
		
		// Combat Attributes
		ocv: 3,
		dcv: 3,
		omcv: 3,
		dmcv: 3,
		speed: 2,
		pd: 2,
		ed: 2,
		body: 10,
		stun: 20,
		endurance: 20,
		recovery: 4,
		
		// Movement Attributes
		running: 12,
		leaping: 4,
		swimming: 4,
		
		// Health Status Attributes
		CurrentBODY: 10,
		CurrentSTUN: 20,
		CurrentEND: 20,
		gearCurrentBODY: 10,
		gearCurrentSTUN: 20,
		gearCurrentEND: 20,
		
		// Make characteristic maximums default to no.
		useCharacteristicMaximums: 0,
		optionTakesNoSTUN: 0,
		
		// Skill levels
		interactionLevelsCP: 0,
		intellectLevelsCP: 0,
		agilityLevelsCP: 0,
		noncombatLevelsCP: 0,
		overallLevelsCP: 0
	}
	
	let hero_caller = {};
	let object; // This is the character object.


	// Styling for the chat responses.
	const style = "margin-left: 0px; overflow: hidden; background-color: royalblue; border: 2px solid #fff990; padding: 5px; border-radius: 5px; color: white; div#home a:link { color: #70DB93; }";
	const buttonStyle = "background-color: dodgerblue; border: 1px solid #292929; width: 25%; border-radius: 3px; padding: 5px; color: #fff; text-align: center; float: right;";
	const altButtonStyle = "background-color: orange; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center; float: right;";
	const linkStyle = "color: green;"

	const script_name = 'HDImporter';
	const state_name = 'HDIMPORTER';
	var verbose = false;
	
	
	// Start messages
	on('ready', function() {
		checkInstall();
		log(script_name + ' Ready! Command: !hero');
		//sendChat(script_name, script_name + ' Ready!\n For help enter "!hero --help"', null, {noarchive:true});
		sendChat(script_name, '<div style="'+style+'"><h3 style="color :yellow; ">' + script_name + ' Ready!</h3><p>For help enter "!hero --help"</p></div>', null, {noarchive:true});
	});


	on('chat:message', (msg) => {
		if (msg.type != 'api') return;
		
		// Split the message into command and argument(s)
		let args = msg.content.split(/ --(help|reset|config|imports|import) ?/g);
		let command = args.shift().substring(1).trim();
		
		if (command === "") {
			return;
		}
		
		hero_caller = getObj('player', msg.playerid);
		
		if (command !== 'hero') {
			return;
		}
		
		let importData = "";
		if(args.length < 1) { sendHelpMenu(hero_caller); return; }
		
		let config = state[state_name][hero_caller.id].config;
		
		for(let i = 0; i < args.length; i+=2) {
			let k = args[i].trim();
			let v = args[i+1] != null ? args[i+1].trim() : null;
			let check = Array.from(v.replace(/\s/g, ''));
			
			switch(k) {
				case 'help':
					sendHelpMenu(hero_caller);
					return;
					
				case 'reset':
					state[state_name][hero_caller] = {};
					setDefaults(true);
					sendConfigMenu(hero_caller);
					return;
					
				case 'config':
					if(args.length > 0){
						let setting = v.split('|');
						let key = setting.shift();
						let value = (setting[0] === 'true') ? true : (setting[0] === 'false') ? false : (setting[0] === '[NONE]') ? '' : setting[0];
						
						if(key === 'prefix' && value.charAt(0) !== '_' && value.length > 0) { value = value + ' ';}
						if(key === 'suffix' && value.charAt(0) !== '_' && value.length > 0) { value = ' ' + value}
						
						state[state_name][hero_caller.id].config[key] = value;
					}
					
					sendConfigMenu(hero_caller);
					return;
					
				case 'imports':
					if(args.length > 0){
						let setting = v.split('|');
						let key = setting.shift();
						let value = (setting[0] === 'true') ? true : (setting[0] === 'false') ? false : (setting[0] === '[NONE]') ? '' : setting[0];
						
						state[state_name][hero_caller.id].config.imports[key] = value;
					}
					
					sendConfigMenu(hero_caller);
					return;
					
				case 'import':
					if (check.length < 2100) {
						// Intended character data length is safely less than the minimum character file size if exported with HDE format version 1.0.
						// This is likely an error.
						sendChat(script_name, '<div style="'+style+'">Hero Importer finished early because the import command does not appear to contain valid character data.</div>' );
						return;
					} else if ( (check[0] !== "{") && (check[check.length - 1] !== "}")) {
						// Improper JSON format.
						sendChat(script_name, '<div style="'+style+'">Hero Importer finished early because the import command does not appear to contain valid character data.</div>' );
						return;
					}
					
					importData = v.replace(/[\n\r]/g, '');
					break;
					
				default:
					sendHelpMenu(hero_caller);
					return;
			}
		}
		
		if ((importData === '') || (typeof importData === "undefined")) {
			return;
		}
		
		var json = importData;
		var character = null;
		
		// Try to catch some bad input. Doesn't currently catch no input.
		try {
		  character = JSON.parse(json).character;
		}
		
		catch(error) {
		  let message = "";
		  	needsExportedVersion.forEach(function(value) {
			message += value + ", ";
		  });
		  
		  // Drop the last comma.
		  message = message.slice(0, -2);
		  
		  sendChat(script_name, '<div style="'+style+'">Hero Importer ended early due to a source content error.</div>' );
		  sendChat(script_name, "Please verify that the character file was exported using HeroSystem6eHeroic.hde (acceptable versions: "+message+"). For help use the command !hero --help.");
		  return;
		}
		
		// Verify that the character was exported with the latest version of HeroSystem6eHeroic.hde. If not, report error and abort.
		if (needsExportedVersion.has(character.version) === false) {
			var last; 
			needsExportedVersion.forEach(k => { last = k });
			
			sendChat(script_name, '<div style="'+style+'">Import of <b>' + character.character_name + '</b> ended early due to version mismatch error.</div>' );
			sendChat(script_name, "Please download and install the latest version of HeroSystem6eHeroic.hde (version: "+last+" recommended) into your Hero Designer export formats folder. Export your character and try HD Importer again. For help use the command !hero --help." );
			
			return;
		}
		
		sendChat(script_name, '<div style="'+style+'">Import of <b>' + character.character_name + '</b> started.</div>', null, {noarchive:true});
		
		object = null;
		
		// Assign a random name if the character doesn't have one.
		if ((character.character_name).length === 0) {
			character.character_name = createRandomString(7);
		}
		
		// Remove characters with the same name if overwrite is enabled.
		if(state[state_name][hero_caller.id].config.overwrite) {
			let objects = findObjs({
				_type: "character",
				name: state[state_name][hero_caller.id].config.prefix + character.character_name + state[state_name][hero_caller.id].config.suffix
			}, {caseInsensitive: true});
			
			if(objects.length > 0) {
				object = objects[0];
				for(let i = 1; i < objects.length; i++){
					objects[i].remove();
				}
			}
		}
		
		if(!object) {
			// Create character object
			object = createObj("character", {
				name: state[state_name][hero_caller.id].config.prefix + character.character_name + state[state_name][hero_caller.id].config.suffix,
				inplayerjournals: playerIsGM(msg.playerid) ? state[state_name][hero_caller.id].config.inplayerjournals : msg.playerid,
				controlledby: playerIsGM(msg.playerid) ? state[state_name][hero_caller.id].config.controlledby : msg.playerid
			});
		}
		
		// Set base character sheet values.
		setAttrs(object.id, defaultAttributes);
		
		// Import Page 1: Characteristics and Bio
		importCharacteristics(object, character, script_name);
		
		// Import Page 2: Martial Arts Maneuvers
		importManeuvers(object, character, script_name);
		
		// Import Page 2: Equipment
		importEquipment(object, character, script_name);
		
		// Import Page 3: Skills
		importAllSkills(object, character, script_name);
		
		// Import Page 4: Powers
		importPowers(object, character, script_name);
		
		// Import Page 5: Perks and Talents
		importPerksAndTalents(object, character, script_name);
		
		// Import Page 5: Complications
		importComplications(object, character, script_name);
		
		// Version
		applyVersion(object, character, script_name, versionSheet);
		
		// Finished notification
		sendChat(script_name, '<div style="'+style+'">Import of <b>' + character.character_name + '</b> finished.</div>', null, {noarchive:true});
	});
	
	// END MAIN
	
	
/* **************************************** */
/* ***  Begin Import Functions          *** */
/* **************************************** */

	var importCharacteristics = function(object, character, script_name) {
		
		/* ************************************************* */
		/* ***  Import Function: Characteristics         *** */
		/* ************************************************* */
		
		// Set sticky note to importer details.
		let importInfoString = "HDImporter for Roll20\n";
		importInfoString = importInfoString + "Version: " + versionMod + "\n";
		if (typeof character.playerName !== "undefined") {
			importInfoString = importInfoString + "Player: " + character.playerName + "\n";
		}
		if (typeof character.gmName !== "undefined") {
			importInfoString = importInfoString + "GM: " + character.gmName + "\n";
		}
		if (typeof character.genre !== "undefined") {
			importInfoString = importInfoString + "Genre: " + character.genre + "\n";
		}
		if (typeof character.campaign !== "undefined") {
			importInfoString = importInfoString + "Campaign: " + character.campaign + "\n";
		}
		if (typeof character.versionHD !== "undefined") {
			importInfoString = importInfoString + "Hero Designer version: " + character.versionHD + "\n";
		}
		importInfoString = importInfoString + "HeroSystem6eHeroic.hde version: " + character.version + "\n";
		if (typeof character.characterFile !== "undefined") {
			importInfoString = importInfoString + "Original file: " + character.characterFile + "\n";
		}
		if (typeof character.timeStamp !== "undefined") {
			importInfoString = importInfoString + "Export date: \n  " + character.timeStamp + "\n";
		}
		
		setAttrs(object.id, {portraitStickyNote: importInfoString});
		
		
		// Set sticky window as visible portrait.
		setAttrs(object.id, {portraitSelection: 2});
		
		// Set bio-type attributes and experience points.
		
		let bio_attributes = {
			character_title: character.character_title,
			backgroundText: character.backgroundText,
			historyText: character.historyText,
			experience: parseInt(character.experience)||0,
			experienceBenefit: parseInt(character.experienceBenefit)||0
		}
		
		setAttrs(object.id, bio_attributes);
		
		if(verbose) {
			sendChat(script_name, "Imported bio and experience.");
		}
		
		// Set primary attributes.
		let primary_attributes = {
			strength: parseInt(character.strength)||10,
			dexterity: parseInt(character.dexterity)||10,
			constitution: parseInt(character.constitution)||10,
			intelligence: parseInt(character.intelligence)||10,
			ego: parseInt(character.ego)||10,
			presence: parseInt(character.presence)||10
		}
		
		setAttrs(object.id, primary_attributes);
		
		if(verbose) {
			sendChat(script_name, "Imported core attributes.");
		}
		
		// Set combat attributes.
		let combat_attributes = {
			ocv: parseInt(character.ocv)||3,
			dcv: parseInt(character.dcv)||3,
			omcv: parseInt(character.omcv)||3,
			dmcv: parseInt(character.dmcv)||3,
			speed: parseInt(character.speed)||2,
			pd: parseInt(character.pd)||2,
			ed: parseInt(character.ed)||2,
			body: parseInt(character.body)||10,
			stun: parseInt(character.stun)||20,
			hiddenSTUN: parseInt(character.stun)||20,
			endurance: parseInt(character.endurance)||20,
			recovery: parseInt(character.recovery)||4
		}
		
		if (character.stun !== "") {
			combat_attributes.stun = parseInt(character.stun);
		} else {
			combat_attributes.stun = 0;
		}
		
		setAttrs(object.id, combat_attributes);
		
		if(verbose) {
			sendChat(script_name, "Imported combat attributes.");
		}
		
		// Set movement attributes.
		
		let movement_attributes = {
			running: parseInt(character.running)||12,
			leaping: parseInt(character.leaping)||4,
			swimming: parseInt(character.swimming)||4
		};
		
		setAttrs(object.id, movement_attributes);
		
		if(verbose) {
			sendChat(script_name, "Imported movement.");
		}
		
		// Set status attributes to starting values
		let health_attributes = {
			CurrentBODY: character.body,
			CurrentSTUN: character.stun,
			CurrentEND: character.endurance,
			gearCurrentBODY: character.body,
			gearCurrentSTUN: character.stun,
			gearCurrentEND: character.endurance
		}
		
		setAttrs(object.id, health_attributes);
		
		if(verbose) {
			sendChat(script_name, "Configured health status.");
		}
		
		return;
	}
	
	
	function createRandomString(length) {
		// random character name from https://sentry.io/answers/generate-random-string-characters-in-javascript/
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		let result = "";
		for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	}
	
	
	var applyVersion = function(object, character, script_name, version) {
		// Set version data to avoid improper sheet auto updates.
		let version_attributes = {
			version: version,
			validateMay23: 1,
			
			// Show the Treasures slide where equipment will appear.	
			gearSlideSelection : "gearTreasures"
		}
		
		setAttrs(object.id, version_attributes);
	}
	
	
	var importManeuvers = function(object, character, script_name) {
			
		/* ************************************************* */
		/* ***  Import Function: Import Maneuvers        *** */
		/* ************************************************* */
		
		
		// Overall list of maneuvers
		let maneuverArray = new Array();
		let maneuverArrayIndex = 0;
		const maxManeuvers = 20;
		const maneuverSlots = 10;
		let importCount = 0;
		let ID = "01";
		
		// Imports twenty martial arts maneuvers, skipping empty slots.
		// Only the first 10 are imported into sheet slots.
		
		for (importCount = 1; importCount < maxManeuvers; importCount++) {
			
			ID = String(importCount).padStart(2,'0');
			
			if ((typeof character.maneuvers["maneuver"+ID] !== "undefined") && (typeof character.maneuvers["maneuver"+ID].name !== "undefined")) {
				maneuverArray[maneuverArrayIndex] = character.maneuvers["maneuver"+ID];
				
				maneuverArrayIndex++;
			}
			
		}
		
		let importedManeuvers = {};
		importCount = 0;
		const nameMax = 16;
		
		while ( (importCount < maneuverSlots) && (importCount < maneuverArrayIndex) ) {
			if (importCount < maneuverArrayIndex) {
				ID = String(importCount+1).padStart(2,'0');
				
				if ( maneuverArray[importCount].name.length > nameMax) {
					importedManeuvers["martialManeuverName"+ID] = maneuverArray[importCount].name.slice(0, nameMax);
					importedManeuvers["martialManeuverEffect"+ID] = maneuverArray[importCount].name + '\n' + maneuverArray[importCount].effect;
				} else {
					importedManeuvers["martialManeuverName"+ID] = maneuverArray[importCount].name;
					importedManeuvers["martialManeuverEffect"+ID] = maneuverArray[importCount].effect;
				}
				
				importedManeuvers["martialManeuverCP"+ID] = maneuverArray[importCount].points;
				importedManeuvers["martialManeuverPhase"+ID] = maneuverArray[importCount].phase;
				importedManeuvers["martialManeuverOCV"+ID] = maneuverArray[importCount].ocv;
				importedManeuvers["martialManeuverDCV"+ID] = maneuverArray[importCount].dcv;
				
				importCount++;
			}
		}
		
		// Import maneuvers.
		setAttrs(object.id, importedManeuvers);
		
		if(verbose) {
			if (importCount === 1) { 
				sendChat(script_name, "Imported 1 maneuver.");
			} else {
				sendChat(script_name, "Imported " + importCount + " maneuvers.");
			}
		}
		
		// Display additional maneuvers in the treasures text box.
		if (maneuverArrayIndex > maneuverSlots) {
			let tempString = "";
			let extras = 0;
			
			for (let i = maneuverSlots; i < maneuverArrayIndex; i++) {
				tempString = tempString + maneuverArray[i].name + "\n";
				tempString = tempString + "CP: " + maneuverArray[i].points + "\n";
				if (maneuverArray[i].ocv !== "") {
					tempString = tempString + "OCV: " + maneuverArray[i].ocv + "\n";
				}
				if (maneuverArray[i].dcv !== "") {
					tempString = tempString + "DCV: " + maneuverArray[i].dcv + "\n";
				}
				if (maneuverArray[i].phase !== "") {
					tempString = tempString + "Phase: " + maneuverArray[i].phase + "\n";
				}
				tempString = tempString + maneuverArray[i].effect + "\n" + "\n";
				extras++;
			}
			
			if(verbose) {
				if (extras === 1) {
					sendChat(script_name, extras + " maneuver placed in treasures.");
				} else {
					sendChat(script_name, extras + " maneuvers placed in treasures.");
				}
			}
			
			// Update treasures in the imported character since this field is used
			// for additional equipment items.
			
			character.treasures = tempString;
			
			// Place additional maneuvers in the treasures text box.
			setAttrs(object.id, {treasures: tempString});
		}
		
		// Make the Maneuver window visible.
		if (importCount>0) {
			setAttrs(object.id, {gearSlideSelection: 2});
		}
		
		return;
	}
	
	
	var importEquipment = function(object, character, script_name) {
		
		/* ************************************************* */
		/* ***  Import Function: Import Equipment        *** */
		/* ************************************************* */
		
		// Imports equipment and sets carried weight.
		// Similar to the way perks and talents are handled, we will parse the imported equipment into temporary arrays.
		
		let strength = parseInt(character.strength)||1;
		let gearTextBox = "";
		
		let tempString;
		let tempPosition;
		let secondPosition;
		let subStringA;
		let subStringB;
		let sampleSize;
		
		// Needed for adjusted damage.
		let advantage = 0;
		
		// Overall array of equipment.
		let equipmentArray = new Array();
		let equipmentArrayIndex = 0;
		
		// Array of items of equipment that are not weapons, armor, or shields.
		let equipmentListArray = new Array();
		let equipmentListArrayIndex = 0;
		
		// Array of items of equipment that are weapons.
		let weaponsArray = new Array();
		let weaponsArrayIndex = 0;
		
		// Array of items of equipment that are weapons.
		let armorArray = new Array();
		let armorArrayIndex = 0;
		
		// Array for multipowers, which need to be independent from others.
		let multipowerArray = new Array();
		let multipowerArrayIndex = 0;
		
		// Read equipment
		const maxEquipment = 16;
		let importCount = 0;
		let ID = "01";
		
		// Imports sixteen martial arts maneuvers, skipping empty slots.
		
		for (importCount = 1; importCount <= maxEquipment; importCount++) {
			
			ID = String(importCount).padStart(2,'0');
			
			if ((typeof character.equipment["equipment"+ID] !== "undefined") && (typeof character.equipment["equipment"+ID].name !== "undefined")) {
				
				equipmentArray[equipmentArrayIndex]=character.equipment["equipment"+ID];
				
				tempString = equipmentArray[equipmentArrayIndex].name;
				
				if ((tempString !== "") && tempString.length) {
					if ((equipmentArray[equipmentArrayIndex].name.includes("Multipower")) || (equipmentArray[equipmentArrayIndex].name.includes("MPSlot"))) {
						// Then place in multipower array.
						multipowerArray[multipowerArrayIndex]=equipmentArray[equipmentArrayIndex];
						multipowerArrayIndex++;	
						
					} else if ((equipmentArray[equipmentArrayIndex].attack !== "") && (equipmentArray[equipmentArrayIndex].damage !== "") && (equipmentArray[equipmentArrayIndex].attack === "true")) {
						// If the item is a damage attack add it to the weapon list.
						weaponsArray[weaponsArrayIndex]=equipmentArray[equipmentArrayIndex];
						weaponsArrayIndex++;
						
					} else if ((equipmentArray[equipmentArrayIndex].defense !== "") && (equipmentArray[equipmentArrayIndex].defense === "true")) {
						// If the item is a defense add it to the armor list.
						// This will need to be updated for shields.
						armorArray[armorArrayIndex]=equipmentArray[equipmentArrayIndex];
						armorArrayIndex++;
						
					} else {
						// If the item is not an attack or defense add it to the equipment list.
						equipmentListArray[equipmentListArrayIndex]=equipmentArray[equipmentArrayIndex];
						equipmentListArrayIndex++;
					}
				}
				
				equipmentArrayIndex++;
			}	
		}
		
		// Write raw details of imported equipment to the treasures slide.
		if (equipmentArrayIndex > 0) {
			
			// Get current contents of the treasures text box.
			if ((typeof character.treasures !== "undefined") && (character.treasures !== "")) {
				tempString = character.treasures;
			} else {
				tempString = "";
			}
			
			// Add equipment to treasures.
			for (let i = 0; i < equipmentArrayIndex; i++) { 
				tempString = tempString + equipmentArray[i].name + '\n';
				if (equipmentArray[i].damage !== "") {
					tempString = tempString + "Damage: " + equipmentArray[i].damage  + ", ";
				}
				if (equipmentArray[i].end !== "") {
					tempString = tempString + "END: " + equipmentArray[i].end  + ", ";
				}
				if (equipmentArray[i].range !== "") {
					tempString = tempString + "Range: " + equipmentArray[i].range  + ", ";
				}
				if (equipmentArray[i].text !== "") {
					tempString = tempString + equipmentArray[i].text;
				}
				if (equipmentArray[i].mass !== "") {
					tempString = tempString + ", Mass: " + equipmentArray[i].mass;
				}
				if (i < (equipmentArrayIndex + 2)) {
					tempString = tempString + '\n' + '\n';
				}
			}
			
			setAttrs(object.id, {treasures: tempString});
			
			// Show the Treasures Gear Tab slide where the multipower equipment will appear.	
			setAttrs(object.id, {gearSlideSelection: 4});
		}
		
		// Prepare object of items that are not weapons or armor. 
		// Assign to character sheet Equipment List.
		
		let importedEquipment = new Array();
		importCount = 0;
		
		// Prepare Items
		for (importCount = 0; importCount < maxEquipment; importCount++) {
			
			ID = String(importCount+1).padStart(2,'0');
			
			if (importCount < equipmentListArrayIndex) {
				
				// Check for charges.
				if (equipmentListArray[importCount].end != "") {
					tempString = equipmentListArray[importCount].end;
					if (tempString.includes("[")) {
						tempString = " (" + parseInt(tempString.replace(/[^\d.-]/g, "")) +")";
					} else {
						tempString = "";
					};
				}
				
				importedEquipment["equipText"+ID] = equipmentListArray[importCount].name;
				
				// Get item mass.
				if (equipmentListArray[importCount].mass !== "") {
					tempString = equipmentListArray[importCount].mass;
					importedEquipment["equipMass"+ID] = getItemMass(tempString, script_name);
				} else {
					importedEquipment["equipMass"+ID] = 0;
				}
			}
		}
		
		// Import equipment.
		setAttrs(object.id, importedEquipment);
		
		if(verbose) {
			sendChat(script_name, "Imported "+ importCount +" pieces of equipment.");
		}
		
		// Prepare objects of weapons. Assign to character sheet Weapon List.
		
		let importedWeapons = new Array();
		const maxAdvantage = 1;
		const maxWeapons = 5;
		let tempValue = 0;
		
		importCount = 0;
		
		for (importCount = 0; importCount < maxWeapons; importCount++) {
		
			ID = String(importCount+1).padStart(2,'0');
			
			if (importCount < weaponsArrayIndex) {
				importedWeapons["weaponName"+ID] = weaponsArray[importCount].name;
				
				// Assign weapon base damage.
				importedWeapons["weaponDamage"+ID] = getDamage(weaponsArray[importCount].damage, script_name);
				
				// Look for weapon advantages.
				tempString = weaponsArray[importCount].text;
				tempValue = getAdvantage(tempString, script_name);
				if (tempValue > maxAdvantage) {
					importedWeapons["weaponAdvantage"+ID] = maxAdvantage;
				} else {
					importedWeapons["weaponAdvantage"+ID] = tempValue;
				}
				
				// Check for Killing Attack.
				tempString = weaponsArray[importCount].text;
				if (tempString.includes("Killing Attack") || tempString.includes("RKA") || tempString.includes("HKA")) {
					// importedWeapons.weaponNormalDamage01= "off";
				} else {
					importedWeapons["weaponNormalDamage"+ID]= "on";
				}
				
				// Get OCV bonus or penalty.
				tempString = weaponsArray[importCount].text;
				importedWeapons["weaponOCV"+ID] = getOCVmodifier(tempString, script_name);
				
				// Check for range mod adjustment.
				tempString = weaponsArray[importCount].text;
				if (tempString.includes("vs. Range Modifier")) {
					tempPosition=tempString.indexOf("vs. Range Modifier");
					importedWeapons["weaponRangeMod"+ID]= parseInt(tempString.substr(tempPosition-3, 2));				
				} else {
					importedWeapons["weaponRangeMod"+ID]= 0;
				}
				
				// Check for modified STUN multiplier.
				tempString = weaponsArray[importCount].text;
				importedWeapons["weaponStunMod"+ID] = getStunModifier(tempString, script_name);
				
				// Check for charges.
				tempString = weaponsArray[importCount].end;
				if (tempString.includes("[")) {
					importedWeapons["weaponShots"+ID] =  parseInt(tempString.replace(/[^\d.-]/g, ""));
				} else {
					importedWeapons["weaponShots"+ID] = 0;
				}
				
				// Get STR minimum and apply strength.	
				tempString = weaponsArray[importCount].text;
				if ((tempString !== "") && tempString.length) {
					importedWeapons["weaponStrengthMin"+ID] = getWeaponStrMin(tempString, script_name);
					importedWeapons["weaponEnhancedBySTR"+ID] = ( checkDamageBySTR(tempString, script_name) ? "on" : "0");
					importedWeapons["weaponStrength"+ID] = ( checkDamageBySTR(tempString, script_name) ? getWeaponStrength(getWeaponStrMin(tempString), strength, script_name) : getWeaponStrMin(tempString, script_name));
				}
				
				// Check for AoE.
				tempString = weaponsArray[importCount].text;
				if (tempString.includes("Area Of Effect")) {
					importedWeapons["weaponAreaEffect"+ID] = "on";
				} else {
					// importedWeapons.weaponAreaEffect01= "off";
				}
				
				// Get weapon mass.
				if (weaponsArray[importCount].mass !== "") {
					tempString = weaponsArray[importCount].mass;
					importedWeapons["weaponMass"+ID] = getItemMass(tempString, script_name);
				} else {
					importedWeapons["weaponMass"+ID] = 0;
				}
				
				// Calculate thrown weapon range or assign range without units.
				importedWeapons["weaponRange"+ID] = getWeaponRange(weaponsArray[importCount].range, character.strength, importedWeapons["weaponMass"+ID], script_name);
			}
			
		}
			
		// Import weapons.
				
		setAttrs(object.id, importedWeapons);
		
		if(verbose) {
			sendChat(script_name, "Imported "+ importCount +" weapons.");
		}
		
		// Prepare object of armor defenses. Assign to character sheet Armor List.
				
		let importedArmor = new Array();
		const maxArmor = 4;
		
		importCount = 0;
		
		for (importCount = 0; importCount < maxWeapons; importCount++) {
		
			ID = String(importCount+1).padStart(2,'0');
			
			if (importCount < armorArrayIndex) {
				importedArmor["armorName"+ID] = armorArray[importCount].name;
				
				// Find resistant protection values.
				// This needs to be adjusted so that it doesn't pick out other PD/ED stats from elsewhere in the text.
				tempString = armorArray[importCount].text;
				
				if (tempString.includes("Resistant Protection")) {
					tempPosition = tempString.indexOf("Resistant Protection");
					sampleSize = 14;
					subStringA = tempString.substr(tempPosition+20, sampleSize);
					
					if (subStringA.includes("PD")) {
						tempPosition = subStringA.indexOf("PD");
						subStringB = subStringA.substr(tempPosition-3, 2);
						importedArmor["armorPD"+ID] = parseInt(subStringB.replace(/[^\d.-]/g, ""));
						importedArmor["totalPD"+ID] = importedArmor["armorPD"+ID] + parseInt(character.pd);
					} else {
						importedArmor["armorPD"+ID] = 0;
						importedArmor["totalPD"+ID] = parseInt(character.pd);
					};
					
					if (subStringA.includes("ED")) {
						tempPosition = subStringA.indexOf("ED");
						subStringB = subStringA.substr(tempPosition-3, 2);
						importedArmor["armorED"+ID] = parseInt(subStringB.replace(/[^\d.-]/g, ""));
						importedArmor["totalED"+ID] = importedArmor["armorED"+ID] + parseInt(character.ed);
					} else {
						importedArmor["armorED"+ID] = 0;
						importedArmor["totalED"+ID] = parseInt(character.ed);
					}; 
				};
				
				// Activation roll
				tempString = armorArray[importCount].text;
				
				if (tempString.includes("Requires A Roll")) {
					tempPosition = tempString.indexOf("Requires A Roll");
					
					sampleSize = 4;
					subStringA = tempString.substr(tempPosition+15, sampleSize);
					subStringB = subStringA.replace(/[^\d]/g, "");
					importedArmor["armorActivation"+ID] = parseInt(subStringB);
				}
				
				// Armor locations
				if (tempString.includes("(locations")) {
					tempPosition = tempString.indexOf("(locations") + 10;
					secondPosition = tempString.indexOf(")", tempPosition);
					
					importedArmor["armorLocations"+ID] = tempString.substr(tempPosition, secondPosition - tempPosition);
					
				}
				
				// Get armor mass.
				if (armorArray[importCount].mass !== "") {
					tempString = armorArray[importCount].mass;
					importedArmor["armorMass"+ID] = getItemMass(tempString, script_name);
				} else {
					importedArmor["armorMass"+ID] = 0;
				}
			}
		}
		
		// Import armor.
		
		setAttrs(object.id, importedArmor);
		
		if(verbose) {
			sendChat(script_name, "Imported " + importCount + " pieces of armor.");
		}
		
		// Identify independent multipowers.
		let equipmentMultipowers = [];
		let shieldSearchIndex;
	
		for (let i=0; i< multipowerArray.length; i++) {
			//sendChat(script_name, "Multipower search "+ i +".");
			if (multipowerArray[i].name.includes("Multipower")) {
				equipmentMultipowers.push(i);
			}
		}
		
		// Find first shield if any.
		let shieldFound = false;
		let importedShield = new Array();
		let shieldID = "06";
		
		for (let i=0; i < equipmentMultipowers.length; i++) {
			// Get next multipower index.
			shieldSearchIndex=equipmentMultipowers[i];
			tempString = multipowerArray[shieldSearchIndex].name;
			tempString = tempString.toLowerCase();
			
			if ( (tempString.includes("shield") || tempString.includes("buckler")) && !shieldFound) {
				// Shield found
				shieldFound = true;
				
				if(verbose) {
					if (equipmentMultipowers !== "undefined") {
						sendChat(script_name, "Found shield multipower.");
					}
				}
				
				// Get shield name.
				importedShield["weaponName"+shieldID] = multipowerArray[shieldSearchIndex].name.replace("(Multipower)","");
				
				// Get STR minimum.
				tempString = multipowerArray[shieldSearchIndex].text;
				importedShield["weaponStrengthMin"+shieldID] = getWeaponStrMin(tempString, script_name);
				
				// Get weapon mass.
				if (multipowerArray[shieldSearchIndex].mass !== "") {
					tempString = multipowerArray[shieldSearchIndex].mass;
					importedShield.shieldMass = getItemMass(tempString, script_name);
				} else {
					importedShield.shieldMass = 0;
				}
				
				// Search for multipower slot that grants DCV.
				let foundShieldDCV = false;
				
				if (i+2 > equipmentMultipowers.length) {
					// Shield is the last multipower in the list.
					for (let j = shieldSearchIndex; j<multipowerArray.length; j++) {
						tempString = multipowerArray[j].text;
						
						//sendChat(script_name, "Seaching multipower for DCV: "+ tempString+".");
						
						if (tempString.includes("DCV")) {
							foundShieldDCV = true;
							
							tempPosition=tempString.indexOf("DCV");
							importedShield.shieldDCV = parseInt(tempString.substr(tempPosition-3,3));
						}
						
						// Stop search
						if (foundShieldDCV) {
							j=multipowerArray.length;
						}
					}
				} else {
					// There is another multipower after the shield. Search slots up to that multipower.
					
					for (let j = shieldSearchIndex; j<equipmentMultipowers[i+1]; j++) {
						tempString = multipowerArray[j].text;
						
						//sendChat(script_name, "Seaching multipower for DCV: "+ tempString+".");
						
						if (tempString.includes("DCV")) {
							foundShieldDCV = true;
							
							tempPosition = tempString.indexOf("DCV");
							importedShield.shieldDCV = parseInt(tempString.substr(tempPosition-3,3));
						}
						
						// Stop search
						if (foundShieldDCV) {
							j = equipmentMultipowers[i+1];
						}
					}
				}
				
				// Search for multipower slot that grants DCV.
				let foundShieldAttack = false;
				
				if (i+2 > equipmentMultipowers.length) {
					// Shield is the last multipower in the list.
					for (let j = shieldSearchIndex; j<multipowerArray.length; j++) {
							
						// sendChat(script_name, "Seaching multipower for Attack: "+ tempString+".");
						
						if ( multipowerArray[j].attack) {
							foundShieldAttack = true;
							
							// Check for Killing Attack.
							tempString = multipowerArray[j].damage;
							
							if (tempString.includes("Killing Attack") || tempString.includes("HKA")) {
								// importedShield.shieldNormalDamage= "off";
							} else {
								importedShield["weaponNormalDamage"+shieldID] = "on";
							};
							
							// Assign weapon damage, making sure the 1/2d6 is a 1d3.
							tempString = multipowerArray[j].damage;
							if (tempString.includes("1/2d6")) {
								importedShield["weaponDamage"+shieldID] = tempString.replace(" 1/2d6", "d6+d3");				
							} else {
								importedShield["weaponDamage"+shieldID] = tempString;
							};
							
							// Check for modified STUN multiplier.
							tempString = multipowerArray[j].text;
							if (tempString.includes("Increased STUN Multiplier")) {
								tempPosition = tempString.indexOf("Increased STUN Multiplier");
								importedShield["weaponStunMod"+shieldID] = parseInt(tempString.substr(tempPosition-3, 2));
							} else if (tempString.includes("Decreased STUN Multiplier")) {
								tempPosition = tempString.indexOf("Decreased STUN Multiplier");
								importedShield["weaponStunMod"+shieldID] = parseInt(tempString.substr(tempPosition-3, 2));
							} else {
								importedShield["weaponStunMod"+shieldID] = 0;
							};
							
							// Get STR minimum.	
							tempString = multipowerArray[j].text;
							if ((tempString !== "") && tempString.length) {
								importedShield["weaponStrengthMin"+shieldID] = getWeaponStrMin(tempString);
								importedShield["weaponEnhancedBySTR"+shieldID] = "on";
								importedShield["weaponStrength"+shieldID] = getWeaponStrength(getWeaponStrMin(tempString), strength, script_name);
							}
						}
						
						// Stop search
						if (foundShieldAttack) {
							j=multipowerArray.length;
						}
					}
				} else {
					// There is another multipower after the shield. Search slots up to that multipower.
					
					for (let j = shieldSearchIndex; j<equipmentMultipowers[i+1]; j++) {
						
						if ( multipowerArray[j].attack) {
							foundShieldAttack = true;
							
							// Check for Killing Attack.
							tempString = multipowerArray[j].damage;
							if (tempString.includes("Killing Attack") || tempString.includes("HKA")) {
								// importedShield.shieldNormalDamage= "off";
							} else {
								importedShield["weaponNormalDamage"+shieldID] = "on";
							};
							
							// Assign weapon damage, making sure the 1/2d6 is a 1d3.
							tempString = multipowerArray[j].damage;
							if (tempString.includes("1/2d6")) {
								importedShield["weaponNormalDamage"+shieldID] = tempString.replace(" 1/2d6", "d6+d3");				
							} else {
								importedShield["weaponNormalDamage"+shieldID]= tempString;
							};
							
							// Check for modified STUN multiplier.
							tempString = multipowerArray[j].text;
							if (tempString.includes("Increased STUN Multiplier")) {
								tempPosition=tempString.indexOf("Increased STUN Multiplier");
								importedShield.shieldStunMod = parseInt(tempString.substr(tempPosition-3, 2));
							} else if (tempString.includes("Decreased STUN Multiplier")) {
								tempPosition=tempString.indexOf("Decreased STUN Multiplier");
								importedShield["weaponStunMod"+shieldID] = parseInt(tempString.substr(tempPosition-3, 2));
							} else {
								importedShield["weaponStunMod"+shieldID] = 0;
							};
							
							// Get STR minimum.	
							tempString = multipowerArray[j].text;
							if ((tempString !== "") && tempString.length) {
								importedShield["weaponStrengthMin"+shieldID] = getWeaponStrMin(tempString);
								importedShield["weaponEnhancedBySTR"+shieldID] = "on";
								importedShield["weaponStrength"+shieldID] = getWeaponStrength(getWeaponStrMin(tempString), strength, script_name);
							}
						}
						
						// Stop search
						if (foundShieldAttack) {
							j=multipowerArray.length;
						}
					}
				}
			} else {
				// The multipower is not named a shield or buckler. Send a summary to the text box.
				if (i+2 > equipmentMultipowers.length) {
					// Item is the last multipower in the list.
					for (let j = shieldSearchIndex; j<multipowerArray.length; j++) {
						tempString = multipowerArray[j].name;
						if (tempString.includes("Multipower")) {
							tempString = tempString.replace("(Multipower) ","");
							gearTextBox = gearTextBox + tempString + "\n";
							
							// Remove units from mass and round to one decimal.
							tempString = multipowerArray[j].mass;
							tempString = parseFloat(tempString.replace(/[^\d.-]/g, ""));
							tempString = Math.round(10*tempString)/10;
							tempString = tempString.toString();
							
							// Add mass to text.
							gearTextBox = gearTextBox + multipowerArray[j].text + ", Mass: " + tempString + " kg.\n";
						} else {
							tempString = tempString.replace("MPSlot","Slot ");
							tempString = tempString.replace("   "," ");
							gearTextBox = gearTextBox +tempString + " ";
							gearTextBox = gearTextBox + multipowerArray[j].text + "\n";
						}	
					}
				} else {
					// There is another multipower item after this one..	
					tempString = multipowerArray[j].name;
					if (tempString.includes("Multipower")) {
						tempString = tempString.replace("(Multipower) ","");
						gearTextBox = gearTextBox + tempString + "\n";
						
						// Remove units from mass and round to one decimal.
						tempString = multipowerArray[j].mass;
						tempString = parseFloat(tempString.replace(/[^\d.-]/g, ""));
						tempString = Math.round(10*tempString)/10;
						tempString = tempString.toString();
						
						// Add mass to text.
						gearTextBox = gearTextBox + multipowerArray[j].text + ", Mass: " + tempString + " kg.\n";
					} else {
						tempString = tempString.replace("MPSlot","Slot ");
						tempString = tempString.replace("   "," ");
						gearTextBox = gearTextBox + tempString + " ";
						gearTextBox = gearTextBox + multipowerArray[j].text + "\n";
					}
				}
				
				if(verbose) {
					if (equipmentMultipowers !== "undefined") {
						sendChat(script_name, "Multipower equipment saved in Gear Notes.");
					}
				}
			}
		}
		
		// Import shield.
		sendChat(script_name, importedShield);
		
		setAttrs(object.id, importedShield);
		
		return;
	}


	var importPerksAndTalents = function(object, character, script_name) {

		/* ************************************************* */
		/* ***  Import Function: Perks and Talents       *** */
		/* ************************************************* */
		
		// The HDE can export ten of each perks and talents.
		// Only the first seven total will be used, with perks first.
		// The rest will be displayed in the text box below complications.
		
		var importedTalents = new Object();
		let perksAndTalentsArray = new Array();
		let perksAndTalentsIndex = 0;
		const maxPerks = 10;
		const maxTalents = 10;
		const maxCombinedSheet = 7;
		
		let importCount = 0;
		
		/* ------------------------- */
		/* Read Perks                */
		/* ------------------------- */
		
		for (importCount = 0; importCount < maxPerks; importCount++) {
		
			ID = String(importCount+1).padStart(2,'0');
			
			if ((typeof character.perks["perk"+ID] !== "undefined") && (character.perks["perk"+ID] !== "") && (typeof character.perks["perk"+ID].type !== "undefined")) {
				perksAndTalentsArray[perksAndTalentsIndex] = {
					type: character.perks["perk"+ID].type,
					text: character.perks["perk"+ID].text + "\n" + character.perks["perk"+ID].notes,
					points: character.perks["perk"+ID].points
				}
				
				perksAndTalentsIndex++;
			}
		}
		
		/* ------------------------- */
		/* Read Talents              */
		/* ------------------------- */
		
		importCount = 0;
		
		for (importCount = 0; importCount < maxTalents; importCount++) {
		
			ID = String(importCount+1).padStart(2,'0');
			
			if ((typeof character.talents["talent"+ID] !== "undefined") && (character.talents["talent"+ID] !== "") && (typeof character.talents["talent"+ID].type !== "undefined")) {
				perksAndTalentsArray[perksAndTalentsIndex] = {
					type: character.talents["talent"+ID].type,
					text: character.talents["talent"+ID].text + "\n" + character.talents["talent"+ID].notes,
					points: character.talents["talent"+ID].points
				}
				
				perksAndTalentsIndex++;
			}
		}
		
		/* -------------------------------------------------------------------------------------- */
		/* Import the first seven into the sheet. Then import the remainder as a text field note.
		/* -------------------------------------------------------------------------------------- */
		
		importCount = 0;
		let maxImport = (perksAndTalentsIndex <= maxCombinedSheet) ? perksAndTalentsIndex : maxCombinedSheet;
		
		if (perksAndTalentsIndex > 0) {
			
			for (importCount = 0; importCount < maxImport; importCount++) {
				
				ID = String(importCount+1).padStart(2,'0');
				
				importedTalents["talentName"+ID] = perksAndTalentsArray[importCount].type;
				importedTalents["talentText"+ID] = perksAndTalentsArray[importCount].text;
				importedTalents["talentCP"+ID] = perksAndTalentsArray[importCount].points;
			}
			
			// Display additional perks and talents in the complications text box.
			if (perksAndTalentsIndex > maxCombinedSheet) {
				let tempString = "";
				let i = 7;
				let extras = 0;
				
				for (let i = 7; i<perksAndTalentsIndex; i++) {
					tempString = tempString + perksAndTalentsArray[i].type + " CP: " + perksAndTalentsArray[i].points + "\n";
					tempString = tempString + perksAndTalentsArray[i].text + "\n";
					extras++;
				}
				
				if(verbose) {
					sendChat(script_name, extras + " perks and talents placed in notes.");
				}
				
				importedTalents.complicationsTextLeft = tempString;	
			}
			
			// Import perks and talents to sheet.
			setAttrs(object.id, importedTalents);
		}
		
		if(verbose) {
			sendChat(script_name, "Imported " + importCount + " perks and talents.");
		}
		
		return;
		// Import of perks and talents finished.
	};
	
	
	var importPowers = function(object, character, script_name) {
		
		/* ************************************************* */
		/* ***  Import Function: Import Powers           *** */
		/* ************************************************* */
		
		// Imports twenty powers, which is Sheet v2.81's capacity.
		
		const maxPowers = 20;
		const overflowPowers = (character.version >= 1.2) ? 10 : 0;
		
		let tempString;
		let tempPosition;
		let endPosition;
		let subStringA;
		let subStringB;
		let sampleSize;
		let control = 0;
		let base = 0;
		let active = 0;
		let cost = 0;
		let advantages = 0;
		let limitations = 0;
		let count = 0;
		let ID = "";
		
		let testObject = {
			testString : "",
			testEndurance : 0,
			powerReducedEND : "standard"
		}
		
		var tempObject = new Object(); 
		
		// Overall list of powers
		var importedPowers = new Object();
		let powerArray = new Array();
		let powerArrayIndex = 0;
		
		let importCount = 0;
		
		/* ------------------------- */
		/* Read Powers               */
		/* ------------------------- */
		
		for (importCount; importCount < maxPowers; importCount++) {
			
			ID = String(importCount+1).padStart(2,'0');
			
			if ((typeof character.powers["power"+ID] !== "undefined") && (typeof character.powers["power"+ID].name !== "undefined")) {
				
				tempString = character.powers["power"+ID].name;
				
				if (tempString.includes("(VPP)")) {
					// Varriable Power Pool found.
					// The pool needs to be split into control and base parts.
					tempString = character.powers["power"+ID].text;
					subStringA = tempString.substring(tempString.indexOf("base") + 4, tempString.indexOf("control cost"));
					control = parseInt(subStringA.replace(/\D/g, '')) || 0;
					base = character.powers["power"+ID].base - heroRoundDown(control, 2);
					character.powers["power"+ID].base = heroRoundDown(control, 2);
					
					// Create entry for Control Cost
					powerArray[powerArrayIndex]={
						name: character.powers["power"+ID].name,
						base: heroRoundDown(control, 2),
						text: character.powers["power"+ID].text,
						cost: character.powers["power"+ID].cost - base,
						endurance: character.powers["power"+ID].endurance,
						damage: character.powers["power"+ID].damage,
						compound: false
					}
					powerArrayIndex++;
					
					// Create entry for Pool Cost
					powerArray[powerArrayIndex]={
						name: character.powers["power"+ID].name,
						base: base,
						text: JSON.stringify(base) + "-point Power Pool.",
						cost: base,
						endurance: character.powers["power"+ID].endurance,
						damage: character.powers["power"+ID].damage,
						compound: false
					}
					powerArrayIndex++;
					
				} else if (tempString.includes("(Multipower)") || tempString.includes("(MPSlot")) {
					// Import multipower or multipower slot.
					powerArray[powerArrayIndex]=character.powers["power"+ID];
					
					powerArrayIndex++;
				} else if (character.powers["power"+ID].compound === "true") {
					// Check for compound power and import sub power part separately if found.
					
					tempString = character.powers["power"+ID].text;
					count = (tempString.match(/plus/g) || []).length+1;
					
					// Remove total costs.
					if (tempString.includes("(Total:")) {
						tempString = tempString.substring(tempString.indexOf(" Real Cost)") + 12);
					}
					
					if(verbose) {
						sendChat(script_name, "Compound power with " + JSON.stringify(count) + " parts.");
					}
					
					for (let i=0; i<count; i++) {
						subStringA = tempString.split("plus")[i];
						
						if (subStringA.includes("(Real Cost:")) {
							subStringB = subStringA.substring(
								subStringA.indexOf("(Real Cost:") + 1, 
								subStringA.lastIndexOf(")")
							);
							
							subStringB = subStringB.replace(/\D/g,"");
							
							cost = parseInt(subStringB)||0;
							
						} else {
							if (i === 0) {
								cost = character.powers["power"+ID].base;
							} else {
								cost = 0;
							}
						}
						
						advantages = findAdvantages(subStringA);
						limitations = findLimitations(subStringA);
						
						active = cost * (limitations + 1);
						base = heroRoundDown(active, (advantages + 1));
						
						// Create entry for compound power
						powerArray[powerArrayIndex]={
							name: character.powers["power"+ID].name,
							base: base,
							text: subStringA,
							cost: cost,
							endurance: character.powers["power"+ID].endurance,
							damage: character.powers["power"+ID].damage,
							compound: true
						}
						
						powerArrayIndex++;
					}
				} else {
					// Import standard power.
					powerArray[powerArrayIndex]=character.powers["power"+ID];
					
					powerArrayIndex++;
				}
			}
		}
		
		// Powers that don't fit in the sheet's slots will be placed in a text field.
		for (importCount; importCount < (maxPowers + overflowPowers); importCount++) {
			
			ID = String(importCount+1).padStart(2,'0');
			
			if ((typeof character.powers["power"+ID] !== "undefined") && (typeof character.powers["power"+ID].name !== "undefined")) {
				
				powerArray[powerArrayIndex]=character.powers["power"+ID];
				
				powerArrayIndex++;
			}
		}
		
		/* ----------------------------------------------------------------------- */
		/* Check for the "takes no stun" power and set the sheet option if found.
		/* ----------------------------------------------------------------------- */
		
		let tempCostArray = [0, 0];
		
		for (let i = 1; i < powerArrayIndex; i++) {
			tempString = powerArray[i].text;
			if (tempString.includes("Takes No STUN")) {
				importedPowers.optionTakesNoSTUN = "on";
				
				importedPowers.pdCP = 3*(character.pd-1);
				importedPowers.edCP = 3*(character.ed-1);
			}
		}
		
		/* ----------------------------------------------------------------------------------------- */
		/* Import the first twenty into the sheet. Then import the remainder as a text field note.
		/* ----------------------------------------------------------------------------------------- */
		
		// This is currently the only function where bonus points are awarded. If this changes, assign to character bonusBenefit.
		let bonusCP = 0;
		let maxImport = (powerArrayIndex <= maxPowers) ? powerArrayIndex : maxPowers;
		
		if (powerArrayIndex > 0) {
			
			for (importCount = 0; importCount < maxImport; importCount++) {
				
				ID = String(importCount+1).padStart(2,'0');
				
				// Assign power effect type.
				importedPowers["powerEffect"+ID] = findEffectType(powerArray[importCount].text);
				
				// If the power does not have a name assign it the effect type.
				if (powerArray[importCount].name === "") {
					importedPowers["powerName"+ID] = importedPowers["powerEffect"+ID];
				} else {
					importedPowers["powerName"+ID] = powerArray[importCount].name;
				}
				
				// Special cases or base cost.
				tempCostArray = getPowerBaseCost(character, powerArray[importCount].base, importedPowers["powerEffect"+ID], powerArray[importCount].text, bonusCP, importedPowers.optionTakesNoSTUN, script_name);
				importedPowers["powerBaseCost"+ID] = tempCostArray[0];
				bonusCP = tempCostArray[1];
				
				// Determine endurance type, advantages, and limitations.
				testObject.testString = powerArray[importCount].text;
				testObject.testEndurance = powerArray[importCount].endurance;
				
				// Get powerReducedEND level and separate endurance limitation or advantage cost.
				testObject = findEndurance(testObject);
				
				importedPowers["powerReducedEND"+ID] = testObject.powerReducedEND;
				
				// Find advantages and limitations values.
				importedPowers["powerAdvantages"+ID] = findAdvantages(testObject.testString);
				importedPowers["powerLimitations"+ID] = findLimitations(testObject.testString);
				importedPowers["powerText"+ID] = powerArray[importCount].text;
				importedPowers["powerAoE"+ID] = isAoE(testObject.testString) ? "on" : 0;
				
				// Search for skill roll.
				tempObject = requiresRoll(testObject.testString);
				importedPowers["powerActivate"+ID] = tempObject.hasRoll ? "on" : 0;
				importedPowers["powerSkillRoll"+ID] = tempObject.hasRoll ? tempObject.skillRoll : 18;
				
				// Search for reduced DCV due to the Concentration limitation.
				importedPowers["powerDCV"+ID] = reducedDCV(testObject.testString);
				
				// Search for zero, half, or full range modifiers.
				importedPowers["powerRMod"+ID] = reducedRMod(testObject.testString);
				
				// Assign effect dice.
				importedPowers["powerDice"+ID] = getDamage(powerArray[importCount].damage);
				
				// Find and assign power type. Remove export notes from names.
				tempString = powerArray[importCount].name;
				if (tempString.includes("(Multipower)")) {
					// Remove note from name.
					importedPowers["powerName"+ID] = tempString.replace("(Multipower) ", "");
					importedPowers["powerType"+ID] = "multipower";
					importedPowers["powerEffect"+ID] = "Multipower";
				} else if (tempString.includes("(MPSlot")) {
					subStringA = powerArray[importCount].cost;
					if (subStringA.includes("v")) {
						// Remove note from name.
						importedPowers["powerName"+ID] = tempString.replace("(MPSlot", "");
						importedPowers["powerType"+ID] = "variableSlot";
					} else if (powerArray[importCount].text.includes("Unified Power")) {
						// Remove note from name.
						importedPowers["powerName"+ID] = tempString.replace("(MPSlot", "");
						importedPowers["powerType"+ID] = "unified";
					} else {
						// Remove note from name.
						importedPowers["powerName"+ID] = tempString.replace("(MPSlot", "");
						importedPowers["powerType"+ID] = "fixedSlot";
					}
				} else if (tempString.includes("(VPP)")) {
					// Remove note from name.
					importedPowers["powerName"+ID] = tempString.replace("(VPP) ", "");
					importedPowers["powerType"+ID] = "powerPool";
					importedPowers["powerEffect"+ID] = "Variable Power Pool";
				} else if (powerArray[importCount].compound === true) {
					importedPowers["powerType"+ID] = "compound";
				} else {
					importedPowers["powerType"+ID] = "single";
				}
				
				// Set attack checkbox for attacks.
				importedPowers["powerAttack"+ID] = isAttack(importedPowers["powerEffect"+ID]) ? "on" : 0;
				
				// Set power type.
				importedPowers["powerDamageType"+ID] = getPowerDamageType(importedPowers["powerEffect"+ID]);
			}
		}
		
		// Display additional powers in the complications text box.
		if (powerArrayIndex > maxPowers) {
			let tempString = "";
			let extras = 0;
			
			for (let i = maxPowers; i < powerArrayIndex; i++) {
				tempString = tempString + powerArray[i].name + "\n";
				if (powerArray[i].damage !== "") {
					tempString = tempString + " Damage: " + powerArray[i].damage + "\n";
				}
				tempString = tempString + " END: " + powerArray[i].endurance + "\n";
				tempString = tempString + " Base CP: " + powerArray[i].base + ", " + " Real CP: " + powerArray[i].cost + "\n";
				tempString = tempString + powerArray[i].text + "\n" + "\n";
				extras++;
			}
			
			if(verbose) {
				sendChat(script_name, extras + " powers placed in notes.");
			}
			
			importedPowers.complicationsTextRight = tempString;	
		}
		
		// Import powers and bonus points to sheet.
		importedPowers.bonusBenefit = bonusCP;
		setAttrs(object.id, importedPowers);
		
		if(verbose) {
			sendChat(script_name, "Imported " + importCount + " powers.");
		}		
		
		return;
	};

	
	var importComplications = function(object, character, script_name) {
		
		/* ************************************************* */
		/* ***  Import Function: Import Complications    *** */
		/* ************************************************* */
		
		// Imports the first six complications.
		let importCount = 0;
		let ID = "";
		const maxComplications = 6;
		var importedComplications = new Object();
		
		/* ------------------------- */
		/* Read Complications        */
		/* ------------------------- */
		
		for (importCount = 0; importCount < maxComplications; importCount++) {
			
			ID = String(importCount+1).padStart(2,'0');
			
			if ((typeof character.complications["complication"+ID] !== "undefined") && (typeof character.complications["complication"+ID].type !== "undefined")) {			
				importedComplications["complicationName"+ID] = character.complications["complication"+ID].type;
				importedComplications["complicationText"+ID] = character.complications["complication"+ID].text + "\n" + character.complications["complication"+ID].notes;
				importedComplications["complicationCP"+ID] = character.complications["complication"+ID].points;
			}
		}
		
		if(verbose) {
			if (importCount === 1) { 
				sendChat(script_name, "Imported 1 complication.");
			} else {
				sendChat(script_name, "Imported " + importCount + " complications.");
			}
		}
		
		// Import complications to sheet.
		setAttrs(object.id, importedComplications);
			
		return;
	};
	
	
	var importAllSkills = function(object, character, script_name) {
	
		/* ************************************************* */
		/* ***  Import Function: Import Skills		    *** */
		/* ************************************************* */
		
		// Struct for counting processed skills.
		
		let sheetSkillIndexes={
			skillIndex: 0,
			generalSkillIndex: 0,
			combatSkillIndex: 0,
			languageSkillIndex: 0
		}
		
		const maxSkills = 50;
		
		for (let importCount = 0; importCount < maxSkills; importCount++) {
		
			ID = String(importCount+1).padStart(2,'0');
			
			if (typeof character.skills["skill"+ID] !== "undefined") {sheetSkillIndexes = importSkill(object, character, script_name, sheetSkillIndexes, character.skills["skill"+ID]);}
		}
		
		return;
	};
	
	
	/* ------------------------- */
	/* Import Helper Functions   */
	/* ------------------------- */
	
	var importSkill = function(object, character, script_name, sheetSkillIndexes, theSkill) {
		// Assign skill to general, combat, language, enhancer, etc.
		
		if (Object.keys(theSkill).length === 0) {
			// Empty Skill.
			return sheetSkillIndexes;
			
		} else if (theSkill.enhancer === "true") {
			// Invoke Skill Enhancer Function
			importSkillEnhancer(object, character, script_name, theSkill.text);
			
		} else if (theSkill.display === "Language") {
			// Call import language function.
			importLanguage(object, character, script_name, theSkill, sheetSkillIndexes.languageSkillIndex);
			sheetSkillIndexes.languageSkillIndex++;
			
		} else if (theSkill.display === "Combat Skill Levels"){
			// Import weapon levels. The combat skill index may or may not be increased.
			// This needs to be decided by the function as more general skill levels
			// use prepared slots on the character sheet.
			sheetSkillIndexes.combatSkillIndex = importWeaponSkill(object, character, script_name, theSkill, sheetSkillIndexes.combatSkillIndex);
			
		} else if (theSkill.display === "Penalty Skill Levels") {
			// Import penalty skill levels.
			sheetSkillIndexes.combatSkillIndex = importWeaponSkill(object, character, script_name, theSkill, sheetSkillIndexes.combatSkillIndex);
			
		} else if (theSkill.display === ("Weapon Familiarity")) {
			// Weapon familiarity skill line.
			// There should be only one line since Hero Designer lumps them together.
			// We need to break them up.
			let tempString = theSkill.text;
			tempString = tempString.replace(/\s\s+/g, " ");
			tempString = tempString.replace("WF: ", "");
			let weaponFamArrayLength = (tempString.split(",").length - 1);
			let weaponFamArray = new Array(weaponFamArrayLength);
			
			for (let i = 0; i <= weaponFamArrayLength; i++) {
				// Split up string into weapon groups.
				if (i < weaponFamArrayLength) {
					// Get first weapon group before a comma.
					weaponFamArray[i] = tempString.substr(0, tempString.indexOf(","));
					
					// Remove that weapon group from the string.
					tempString = tempString.replace(weaponFamArray[i] + ", ", "");
				} else {
					// There is only one group left to get.
					weaponFamArray[i] = tempString;
				}
			} 
			
			// Process the skills in weaponFamArray as individual skills.
			// The combatSkillIndex will advance each time.
			for (let i = 0; i <= weaponFamArrayLength; i++) {
				let tempSkill = {
					name: "",
					enhancer: "",
					text: weaponFamArray[i],
					display:"Weapon Familiarity",
					cost: 0
				}
				if (tempSkill.text.includes("Common") || tempSkill.text.includes("Small Arms") || tempSkill.text.includes("Emplaced Weapons") || tempSkill.text.includes("Beam Weapons") || tempSkill.text.includes("Energy Weapons") || tempSkill.text.includes("Early Firearms") || tempSkill.text.includes("Siege Engines")) {
					tempSkill.cost = 2;
				} else {
					tempSkill.cost = 1;
				}
				
				sheetSkillIndexes.combatSkillIndex = importWeaponSkill(object, character, script_name, tempSkill, sheetSkillIndexes.combatSkillIndex);
			}	
		} else if (theSkill.display === ("Transport Familiarity")) {
			// Transport familiarity skill line.
			// There should be only one line since Hero Designer lumps them together.
			// We need to break them up.
			let tempString = theSkill.text;
			tempString = tempString.replace(/\s\s+/g, " ");
			tempString = tempString.replace("TF: ", "");
			let transportFamArrayLength = (tempString.split(",").length - 1);
			let transportFamArray = new Array(transportFamArrayLength);
			
			for (let i = 0; i <= transportFamArrayLength; i++) {
				// Split up string into transport groups.
				if (i < transportFamArrayLength) {
					// Get first weapon group before a comma.
					transportFamArray[i] = tempString.substr(0, tempString.indexOf(","));
					
					// Remove that weapon group from the string.
					tempString = tempString.replace(transportFamArray[i]+", ", "");
				} else {
					// There is only one group left to get.
					transportFamArray[i] = tempString;
				}
			} 
			
			// Process the skills in transportFamArray as individual skills.
			// The generalSkillIndex will advance each time.
			for (let i = 0; i <= transportFamArrayLength; i++) {
				let tempSkill = {
					name: transportFamArray[i],
					enhancer: "",
					text: "TF: " + transportFamArray[i],
					display:"Transport Familiarity",
					cost: 1
				}
				
				// Find 2-point TF groups.
				if (tempSkill.text.includes("Common") || tempSkill.text.includes("Riding") || tempSkill.text.includes("Space Vehicles") || tempSkill.text.includes("Mecha")) {
					tempSkill.cost = 2;
				}
				
				sheetSkillIndexes.generalSkillIndex = importGeneralSkill(object, character, script_name, tempSkill, sheetSkillIndexes.generalSkillIndex);
			}	
		} else if (theSkill.display === "Skill Levels") {
			// Import non-combat skill levels.
			// Groups of three skills will be a challenge.
			
			if (theSkill.text.includes("three pre-defined Skills")) {
				// This type of skill level is recorded along with general skills.
				sheetSkillIndexes.generalSkillIndex = importGeneralSkill(object, character, script_name, theSkill, sheetSkillIndexes.generalSkillIndex);
			} else if (parseInt(theSkill.cost/theSkill.levels) === 3) {
				// This type of skill level is recorded along with general skills.
				
				sheetSkillIndexes.generalSkillIndex = importGeneralSkill(object, character, script_name, theSkill, sheetSkillIndexes.generalSkillIndex);
			} else {
				importSkillLevels(object, character, script_name, theSkill);
			}
		} else {
			// Import general skill
			
			sheetSkillIndexes.generalSkillIndex = importGeneralSkill(object, character, script_name, theSkill, sheetSkillIndexes.generalSkillIndex);
		}
		
		sheetSkillIndexes.skillIndex++;
		
		return sheetSkillIndexes;
	}
	
	
	var importSkillEnhancer = function(object, character, script_name, enhancerString) {
		// This function is called when a skill is identified as an enhancer.
		// The skills' text will determine which enhancer it is.
		let enhancer;
		
		switch(enhancerString) {
			  case "Jack of All Trades":
				enhancer = {
					enhancerJack: "on",
					enhancerJackCP: 3
				}
				break;
			case "Linguist":
				enhancer = {
					enhancerLing: "on",
					enhancerLingCP: 3
				}
				break;
			case "Scholar":
				enhancer = {
					enhancerSch: "on",
					enhancerSchCP: 3
				}
				break;
			case "Scientist":
				enhancer = {
					enhancerSci: "on",
					enhancerSciCP: 3
				}
				break;
			case "Traveler":
				enhancer = {
					enhancerTrav: "on",
					enhancerTravCP: 3
				}
				break;
		  default:
				  // Well-Connected
				enhancer = {
					enhancerWell: "on",
					enhancerWellCP: 3
				}
		}
		
		setAttrs(object.id, enhancer);
		
		return;
	}

	
	var importLanguage = function(object, character, script_name, languageObject, languageIndex) {
		// This function is called when a skill is identified as an enhancer.
		// The skills' text will determine which enhancer it is.
		// let languages;

		let language;
		let name = languageObject.name;
		let tempString = languageObject.text;
		if (name === "") {
			if (tempString.includes("Language:")) {
				name = tempString.replace("Language:", "");
			}
			if (name.includes("(") && name.includes(")")) {
				let endPosition = name.indexOf("(");
				name = name.slice(0, endPosition-1);
			}
		}
		
		let fluency;
		let literacy;
		let cost = languageObject.cost;
		
		// Determine fluency.
		if (tempString.includes("native")) {
			fluency = "native";
		} else if (cost == 0) {
			fluency = "native";
		} else if ((cost == 1) && (tempString.includes("literate"))) {
			fluency = "native";
		} else if (tempString.includes("basic")) {
			fluency = "basic";
		} else if (tempString.includes("completely")) {
			fluency = "accent";
		} else if (tempString.includes("fluent")) {
			fluency = "fluent";
		} else if (tempString.includes("idiomatic")) {
			fluency = "idiomatic";
		} else if (tempString.includes("imitate")) {
			fluency = "imitate";
		} else {
			fluency = "none";
		}
			
		// Determine literacy.
		if (tempString.includes("literate")) {
			literacy = "on";
		}
		else {
			literacy = 0;
		}
		
		// Assign this language to the character sheet.
		
		switch(languageIndex) {
			case 0:
				language = {
					skillName41: name,
					skillFluency41: fluency,
					skillLiteracy41: literacy
				}
				break;
			case 1:
				language = {
					skillName42: name,
					skillFluency42: fluency,
					skillLiteracy42: literacy
				}
				break;
			case 2:
				language = {
					skillName43: name,
					skillFluency43: fluency,
					skillLiteracy43: literacy
				}
				break;
			case 3:
				language = {
					skillName44: name,
					skillFluency44: fluency,
					skillLiteracy44: literacy
				}
				break;
			case 4:
				language = {
					skillName45: name,
					skillFluency45: fluency,
					skillLiteracy45: literacy
				}
				break;
			case 5:
				language = {
					skillName46: name,
					skillFluency46: fluency,
					skillLiteracy46: literacy
				}
				break;
			case 6:
				language = {
					skillName47: name,
					skillFluency47: fluency,
					skillLiteracy47: literacy
				}
				break;
			case 7:
				language = {
					skillName48: name,
					skillFluency48: fluency,
					skillLiteracy48: literacy
				}
				break;
			default:
				// Last language slot available.
				language = {
					skillName49: name,
					skillFluency49: fluency,
					skillLiteracy49: literacy
				}
		}
		
		setAttrs(object.id, language);
		
		return;
	}
	
	
	var importWeaponSkill = function(object, character, script_name, skillObject, weaponSkillIndex) {
		// Identify and assign combat levels
		
		let weaponSkill;
		let name = skillObject.name;
		let levels = parseInt(skillObject.levels);
		let levelCost;
		let type = 'none';
		let cost = parseInt(skillObject.cost);
	
		if (skillObject.text.includes("HTH Combat")) {
			// Find the number of levels from the CP spent.
			weaponSkill = {skillLevels38: skillObject.levels};
			
		} else if (skillObject.text.includes("Ranged Combat")) {
			// Find the number of levels from the CP spent.
			weaponSkill = {skillLevels39: skillObject.levels};
			
		} else if (skillObject.text.includes("All Attacks")) {
			// Find the number of levels from the CP spent.
			weaponSkill = {skillLevels40: skillObject.levels};
			
		} else if (skillObject.text.includes("group") || skillObject.text.includes("single") || (skillObject.display === "Weapon Familiarity") || (skillObject.display === "Penalty Skill Levels") || (skillObject.display === "Combat Skill Levels")) {
			// Call import weapon skills function.
			
			// Determine type
			if (skillObject.display === "Weapon Familiarity") {
				// Weapon familiarity at the moment can be common or single.
				if (cost === 1) {
					name = skillObject.text;
					type = "Fam1";
					levels = 0;
				} else {
					name = skillObject.text.replace("Weapons", "");
					type = "Fam2";
					levels = 0;
				}
			} else if (skillObject.display === "Penalty Skill Levels") {
				// Determine penalty skill levels
				
				// Try to shorten the name text.
				name = skillObject.text.replace("versus", "vs");
				name = name.replace("Versus", "vs");
				name = name.replace("Location", "Loc");
				name = name.replace("Range", "Rng");
				name = name.replace("Modifiers ", "");
				name = name.replace("Modifier ", "");
				name = name.replace("with", "w/");
				name = name.replace("the ", "");
				
				levelCost = parseInt(cost/levels);
				switch (levelCost) {
					case 1: type = 'PSL1';
						break;
					case 2: type = 'PSL2';
						break;
					case 3: type = 'PSL3';
						break;
					default: 'none';
				}
			} else {
				// Determine combat skill levels	
				name = skillObject.text.replace("with", "w/");
				
				levelCost = parseInt(cost/levels);
				switch (levelCost) {
					case 2: type = 'CSL2';
						break;
					case 3: type = 'CSL3';
						break;
					case 5: type = 'CSL5';
						break;
					case 8: type = 'CSL8';
						break;
					default: 'none';
				}
			}
			
			// Assign skill parameters to an open weapon skill slot.
			switch (weaponSkillIndex) {
				case 0:
					// Weapon skill slot 1.
					weaponSkill = {
						skillName31: name,
						skillType31: type,
						skillLevels31: levels,
						skillCP31: cost
					}
					break;
				case 1:
					// Weapon skill slot 2.
					weaponSkill = {
						skillName32: name,
						skillType32: type,
						skillLevels32: levels,
						skillCP32: cost
					}
					break;
				case 2:
					// Weapon skill slot 3.
					weaponSkill = {
						skillName33: name,
						skillType33: type,
						skillLevels33: levels,
						skillCP33: cost
					}
					break;
				case 3:
					// Weapon skill slot 4.
					weaponSkill = {
						skillName34: name,
						skillType34: type,
						skillLevels34: levels,
						skillCP34: cost
					}
					break;
				case 4:
					// Weapon skill slot 5.
					weaponSkill = {
						skillName35: name,
						skillType35: type,
						skillLevels35: levels,
						skillCP35: cost
					}
					break;
				case 5:
					// Weapon skill slot 6.
					weaponSkill = {
						skillName36: name,
						skillType36: type,
						skillLevels36: levels,
						skillCP36: cost
					}
					break;
				case 6:
					// Last weapon skill slot available.
					weaponSkill = {
						skillName37: name,
						skillType37: type,
						skillLevels37: levels,
						skillCP37: cost
					}
			}
			weaponSkillIndex++;
		}
		
		setAttrs(object.id, weaponSkill);
		
		return weaponSkillIndex;
	}
	
	
	var importSkillLevels = function(object, character, script_name, skillObject) {
		
		if (skillObject.text.includes("all Intellect Skills")) {
			// The broad group skill level is ambiguous.
			// By default we will guess intellect as the most common.
			
			if (skillObject.name.includes("nteract")) {
				// Look at name to see if player added interaction label.
				let skillLevel = {
					interactionLevels: skillObject.levels,
					interactionLevelsCP: skillObject.levels*4
				}
				
				if(verbose) {
					sendChat(script_name, "Found interaction group levels.");
				}
				setAttrs(object.id, skillLevel);
			} else if (skillObject.name.includes("ntellect")) {
				// Look at name to see if player added intellect label.
				let skillLevel = {
					intellectLevels: skillObject.levels,
					intellectLevelsCP: skillObject.levels*4
				}
				
				if(verbose) {
					sendChat(script_name, "Found intellect group levels.");
				}
				setAttrs(object.id, skillLevel);
			} else {
				// Assume intellect.
				let skillLevel = {
					intellectLevels: skillObject.levels,
					intellectLevelsCP: skillObject.levels*4
				}
				
				if(verbose) {
					sendChat(script_name, "Found broad group levels. Assuming intellect.");
				}
				setAttrs(object.id, skillLevel);
			}
		} else if (skillObject.text.includes("all Agility Skills")) {
			let skillLevel = {
				agilityLevels: skillObject.levels,
				agilityLevelsCP: skillObject.levels*6
			}
			setAttrs(object.id, skillLevel);
		} else if (skillObject.text.includes("all Non-Combat Skills")) {
			let skillLevel = {
				noncombatLevels: skillObject.levels,
				noncombatLevelsCP: skillObject.levels*10
			}
			setAttrs(object.id, skillLevel);
		} else if (skillObject.text.includes("Overall")) {
			let skillLevel = {
				overallLevels: skillObject.levels,
				overallLevelsCP: skillObject.levels*12
			}
			setAttrs(object.id, skillLevel);
		} 
		
		return;
	}
	
	var importGeneralSkill = function(object, character, script_name, skillObject, generalSkillIndex) {
		// Identify and import a general skill.
		
		let theSkill;
		let attribute = skillObject.attribute;
		let text = skillObject.text;
		let type = "none";
		let base = skillObject.base;
		let levels = skillObject.levels;
		let cost = skillObject.cost;
		
		if (skillObject.display === ("Skill Levels")) {
			// Three-group skill.
			type = "group";
		} else if (skillObject.text.includes("three pre-defined Skills")) {
			// Three-group skill.
			type = "group";
		} else if (text.startsWith("KS") && ((base-levels) === 2)) {
			// Knowledge Skill
			type = "ks";
		} else if (text.startsWith("KS") && ((base-levels) === 3)) {
			// Knowledge Skill based on INT.
			type = "intKS";
		} else if (text.startsWith("Science Skill") && ((base-levels) === 2)) {
			// Science Skill
			type = "ss";
		} else if (text.startsWith("Science Skill") && ((base-levels) === 3)) {
			// Science Skill based on INT.
			type = "intSS";
		} else if (text.startsWith("AK")) {
			// Area Knowledge.
			type = "ak";
		} else if (text.startsWith("TF")) {
			// Transport familiarity.
			type = "tf";
		} else if (text.startsWith("PS")) {
			// Professional skill.
			type = "ps";
		} else if (attribute === "INT") {
			// Intellect skill.
			type = "int";
		} else if (attribute === "DEX") {
			// Agility skill.
			type = "dex";
		} else if (attribute === "PRE") {
			// Interact skill.
			type = "pre";
		} else if (attribute === "EGO") {
			// Ego skill. Probably faith.
			type = "ego";
		} else if (attribute === "STR") {
			// Strength skill (unusual).
			type = "str";
		} else if (attribute === "CON") {
			// Constitution skill (unusual).
			type = "con";
		} else if (skillObject.display === "Cramming") {
			// Special skill.
			type = "other";
		} else {
			// Most others will be combat.
			type = "combat";
		}
		
		// Try to find the best name of the skill. 
		// It may be in .name, .text, or .display.
		
		let name = skillObject.name;
		if (name === "") {
			if ((text !== "") && text.includes("AK: ")) {
				name = text.replace("AK: ", "");
				name = name.slice(0, -3);
			} else if ((text !== "") && text.includes("KS: ")) {
				name = text.replace("KS: ", "");
				name = name.slice(0, -3);
			} else if ((text !== "") && text.includes("SS: ")) {
				name = text.replace("SS: ", "");
				name = name.slice(0, -3);
			} else if ((text !== "") && text.includes("Science Skill: ")) {
				name = text.replace("Science Skill: ", "");
				name = name.slice(0, -3);
			} else if ((text !== "") && text.includes("PS: ")) {
				name = text.replace("PS: ", "");
				name = name.slice(0, -3);
			} else if (skillObject.display !== "") {
				name = skillObject.display;
			}
		}
		
		// Import the skill based on the general skill index location.
		
		switch (generalSkillIndex) {
			case 0: theSkill = {skillName01: name, skillType01: type, skillCP01: cost};
				break;
			case 1: theSkill = {skillName02: name, skillType02: type, skillCP02: cost};
				break;
			case 2: theSkill = {skillName03: name, skillType03: type, skillCP03: cost};
				break;
			case 3: theSkill = {skillName04: name, skillType04: type, skillCP04: cost};
				break;
			case 4: theSkill = {skillName05: name, skillType05: type, skillCP05: cost};
				break;
			case 5: theSkill = {skillName06: name, skillType06: type, skillCP06: cost};
				break;
			case 6: theSkill = {skillName07: name, skillType07: type, skillCP07: cost};
				break;
			case 7: theSkill = {skillName08: name, skillType08: type, skillCP08: cost};
				break;
			case 8: theSkill = {skillName09: name, skillType09: type, skillCP09: cost};
				break;
			case 9: theSkill = {skillName10: name, skillType10: type, skillCP10: cost};
				break;
			case 10: theSkill = {skillName11: name, skillType11: type, skillCP11: cost};
				break;
			case 11: theSkill = {skillName12: name, skillType12: type, skillCP12: cost};
				break;
			case 12: theSkill = {skillName13: name, skillType13: type, skillCP13: cost};
				break;
			case 13: theSkill = {skillName14: name, skillType14: type, skillCP14: cost};
				break;
			case 14: theSkill = {skillName15: name, skillType15: type, skillCP15: cost};
				break;
			case 15: theSkill = {skillName16: name, skillType16: type, skillCP16: cost};
				break;
			case 16: theSkill = {skillName17: name, skillType17: type, skillCP17: cost};
				break;
			case 17: theSkill = {skillName18: name, skillType18: type, skillCP18: cost};
				break;
			case 18: theSkill = {skillName19: name, skillType19: type, skillCP19: cost};
				break;
			case 19: theSkill = {skillName20: name, skillType20: type, skillCP20: cost};
				break;
			case 20: theSkill = {skillName21: name, skillType21: type, skillCP21: cost};
				break;
			case 21: theSkill = {skillName22: name, skillType22: type, skillCP22: cost};
				break;
			case 22: theSkill = {skillName23: name, skillType23: type, skillCP23: cost};
				break;
			case 23: theSkill = {skillName24: name, skillType24: type, skillCP24: cost};
				break;
			case 24: theSkill = {skillName25: name, skillType25: type, skillCP25: cost};
				break;
			case 25: theSkill = {skillName26: name, skillType26: type, skillCP26: cost};
				break;
			case 26: theSkill = {skillName27: name, skillType27: type, skillCP27: cost};
				break;
			case 27: theSkill = {skillName28: name, skillType28: type, skillCP28: cost};
				break;
			case 28: theSkill = {skillName29: name, skillType29: type, skillCP29: cost};
				break;
			
			default: theSkill = {skillName30: name, skillType30: type, skillCP30: cost};
		}
		
		setAttrs(object.id, theSkill);
		
		generalSkillIndex++;
		
		return generalSkillIndex;
	}
	
	var findEndurance = function(testObject) {
		// Determine endurance type, advantages, and limitations.
		// Remove advantage or limitation from tempString so that they aren't counted twice.
		
		// testObject should have three items:
		// testString, testEndurance, powerReducedEND
		
		let tempString = testObject.testString;
		let endString = testObject.testEndurance;
		
		if ((tempString.includes("Costs Endurance (-1/4)")) && (endString.includes("["))) {
			testObject.powerReducedEND = "costsENDhalf";
			tempString = tempString.replace("Costs Endurance (-1/4)", "");
		} else if ((tempString.includes("Costs Endurance (-1/2)")) && (endString.includes("["))) {
			testObject.powerReducedEND = "costsENDfull";
			tempString = tempString.replace("Costs Endurance (-1/2)", "");
		} else if (endString.includes("[")) {
			testObject.powerReducedEND = "noEND";
		} else if (tempString.includes("Costs Endurance (-1/4)")) {
			testObject.powerReducedEND = "costsENDhalf";
			tempString = tempString.replace("Costs Endurance (-1/4)", "");
		} else if (tempString.includes("Costs Endurance (-1/2)")) {
			testObject.powerReducedEND = "costsENDfull";
			tempString = tempString.replace("Costs Endurance (-1/2)", "");
		} else if ((tempString.includes("Reduced Endurance (1/2 END; +1/2)")) && (tempString.includes("Autofire"))) {
			testObject.powerReducedEND = "reducedENDAF";
			tempString = tempString.replace("Reduced Endurance (1/2 END; +1/2)", "");
		} else if (tempString.includes("Reduced Endurance (0 END; +1/2)")) {
			testObject.powerReducedEND = "zeroEND";
			tempString = tempString.replace("Reduced Endurance (0 END; +1/2)", "");
		} else if (tempString.includes("Reduced Endurance (0 END; +1)")) {
			testObject.powerReducedEND = "zeroENDAF";
			tempString = tempString.replace("Reduced Endurance (0 END; +1)", "");
		} else if (tempString.includes("Reduced Endurance (1/2 END; +1/4)")) {
			testObject.powerReducedEND = "reducedEND";
			tempString = tempString.replace("Reduced Endurance (1/2 END; +1/4)", "");
		} else if (tempString.includes("Increased Endurance Cost (x2 END; -1/2)")) {
			testObject.powerReducedEND = "increasedENDx2";
			tempString = tempString.replace("Increased Endurance Cost (x2 END; -1/2)", "");
		} else if (tempString.includes("Increased Endurance Cost (x3 END; -1)")) {
			testObject.powerReducedEND = "increasedENDx3";
			tempString = tempString.replace("Increased Endurance Cost (x3 END; -1)", "");
		} else if (tempString.includes("Increased Endurance Cost (x4 END; -1 1/2)")) {
			testObject.powerReducedEND = "increasedENDx4";
			tempString = tempString.replace("Increased Endurance Cost (x4 END; -1 1/2)", "");
		} else if (tempString.includes("Increased Endurance Cost (x5 END; -2)")) {
			testObject.powerReducedEND = "increasedENDx5";
			tempString = tempString.replace("Increased Endurance Cost (x5 END; -2)", "");
		} else if (tempString.includes("Increased Endurance Cost (x6 END; -2 1/2)")) {
			testObject.powerReducedEND = "increasedENDx6";
			tempString = tempString.replace("Increased Endurance Cost (x6 END; -2 1/2)", "");
		} else if (tempString.includes("Increased Endurance Cost (x7 END; -3)")) {
			testObject.powerReducedEND = "increasedENDx7";
			tempString = tempString.replace("Increased Endurance Cost (x7 END; -3)", "");
		} else if (tempString.includes("Increased Endurance Cost (x8 END; -3 1/2)")) {
			testObject.powerReducedEND = "increasedENDx8";
			tempString = tempString.replace("Increased Endurance Cost (x8 END; -3 1/2)", "");
		} else if (tempString.includes("Increased Endurance Cost (x9 END; -3 1/2)")) {
			testObject.powerReducedEND3 = "increasedENDx9";
			tempString = tempString.replace("Increased Endurance Cost (x9 END; -3 1/2)", "");
		} else if (tempString.includes("Increased Endurance Cost (x10 END; -4)")) {
			testObject.powerReducedEND = "increasedENDx10";
			tempString = tempString.replace("Increased Endurance Cost (x10 END; -4)", "");
		} else if (endString == "") {
			testObject.powerReducedEND = "noEND";
		} else if (endString == 0) {
			testObject.powerReducedEND = "noEND";
		} else {
			testObject.powerReducedEND = "standardEND";
		}
		
		testObject.testString = tempString;
		
		return testObject;
	}
	
	var findEffectType = function(tempString) {
		// Search for and return effect keywords.
		
		let lowerCaseString = tempString.toLowerCase();
		
		if (lowerCaseString.includes("applied to str")) {
			return "Base STR Mod";	
		} else if (lowerCaseString.includes("applied to running")) {
			return "Base Running Mod";	
		} else if (lowerCaseString.includes("applied to leaping")) {
			return "Base Leaping Mod";	
		} else if (lowerCaseString.includes("applied to swimming")) {
			return "Base Swimming Mod";	
		} else if (lowerCaseString.includes("applied to pd")) {
			return "Base PD Mod";	
		} else if (lowerCaseString.includes("applied to ed")) {
			return "Base ED Mod";	
		} else if (tempString.includes("Absorption")) {
			return "Absorption";
		} else if (tempString.includes("Aid")) {
			return "Aid"; 
		} else if (tempString.includes("Automaton")) {
			return "Automaton";
		} else if (tempString.includes("Barrier")) {
			return "Barrier";
		} else if (tempString.includes("Blast")) {
			return "Blast";
		} else if (tempString.includes("Change Environment")) {
			return "Change Environment";
		} else if (tempString.includes("Clairsentience")) {
			return "Clairsentience";
		} else if (tempString.includes("Clinging")) {
			return "Clinging";
		} else if (tempString.includes("Damage Negation")) {
			return "Damage Negation";
		} else if (tempString.includes("Damage Reduction")) {
			return "Damage Reduction";
		} else if (tempString.includes("Darkness")) {
			return "Darkness"; 
		} else if (tempString.includes("Deflection")) {
			return "Deflection";
		} else if (tempString.includes("Density Increase")) {
			return "Density Increase";
		} else if (tempString.includes("Desolidification")) {
			return "Desolidification";
		} else if (tempString.includes("Dispel")) {
			return "Dispel";
		} else if (tempString.includes("Does Not Bleed")) {
			return "Does Not Bleed";
		} else if (tempString.includes("Drain")) {
			return "Drain";
		} else if (tempString.includes("Duplication")) {
			return "Duplication";
		} else if (tempString.includes("Enhanced Senses")) {
			return "Enhanced Senses";
		} else if (tempString.includes("Entangle")) {
			return "Entangle";
		} else if (tempString.includes("Extra Limb")) {
			return "Extra Limb";
		} else if (tempString.includes("Extra-Dimensional Movement")) {
			return "Extra-Dimensional Movement";
		} else if (tempString.includes("Faster-Than-Light-Travel")) {
			return "Faster-Than-Light-Travel";
		} else if (tempString.includes("Flash")) {
			return "Flash";
		} else if (tempString.includes("Flash Defense")) {
			return "Flash Defense";
		} else if (tempString.includes("Flight")) {
			return "Flight";
		} else if (tempString.includes("Growth")) {
			return "Growth";
		} else if (tempString.includes("Hand-To-Hand Attack")) {
			return "HTH Attack";
		} else if (tempString.includes("Healing")) {
			return "Healing";
		} else if (tempString.includes("Images")) {
			return "Images";
		} else if (tempString.includes("Invisibility")) {
			return "Invisibility";
		} else if (tempString.includes("Killing Attack - Hand-To-Hand")) {
			return "HTH Killing Attack";
		} else if (tempString.includes("HKA")) {
			return "HTH Killing Attack";
		} else if (tempString.includes("Killing Attack - Ranged")) {
			return "Ranged Killing Attack";
		} else if (tempString.includes("RKA")) {
			return "Ranged Killing Attack";
		} else if (tempString.includes("Knockback Resistance")) {
			return "Knockback Resistance";
		} else if (tempString.includes("Leaping")) {
			return "Leaping";
		} else if (tempString.includes("Life Support")) {
			return "Life Support";
		} else if (tempString.includes("Luck")) {
			return "Luck";
		} else if (tempString.includes("Mental Blast")) {
			return "Mental Blast";
		} else if (tempString.includes("Mental Defense")) {
			return "Mental Defense";
		} else if (tempString.includes("Mental Illusions")) {
			return "Mental Illusions";
		} else if (tempString.includes("Mind Control")) {
			return "Mind Control";
		} else if (tempString.includes("Mind Link")) {
			return "Mind Link";
		} else if (tempString.includes("Mind Scan")) {
			return "Mind Scan";
		} else if (tempString.includes("Multiform")) {
			return "Multiform";
		} else if (tempString.includes("No Hit Locations")) {
			return "No Hit Locations";
		} else if (tempString.includes("Possession")) {
			return "Possession";	
		} else if (tempString.includes("Power Defense")) {
			return "Power Defense";
		} else if (tempString.includes("Reflection")) {
			return "Reflection";
		} else if (tempString.includes("Regeneration")) {
			return "Regeneration";
		} else if (tempString.includes("Resistant")) {
			return "Resistant Protection";
		} else if (tempString.includes("Running")) {
			return "Running";	
		} else if (tempString.includes("Shape Shift")) {
			return "Shape Shift";
		} else if (tempString.includes("Shrinking")) {
			return "Shrinking";
		} else if (tempString.includes("Stretching")) {
			return "Stretching";
		} else if (tempString.includes("Summon")) {
			return "Summon";
		} else if (tempString.includes("Swimming")) {
			return "Swimming";	
		} else if (tempString.includes("Swinging")) {
			return "Swinging";
		} else if (tempString.includes("Takes No STUN")) {
			return "Takes No STUN";	
		} else if (tempString.includes("Telekinesis")) {
			return "Telekinesis";
		} else if (tempString.includes("Telepathy")) {
			return "Telepathy";	
		} else if (tempString.includes("Teleportation")) {
			return "Teleportation";	
		} else if (tempString.includes("Transform")) {
			return "Transform";
		} else if (tempString.includes("Tunneling")) {
			return "Tunneling";	
		} else if (tempString.includes("Active Sonar")) {
			return "Active Sonar";
		} else if (tempString.includes("Detect")) {
			return "Detect";	
		} else if (tempString.includes("Enhanced Perception")) {
			return "Enhanced PER";	
		} else if (tempString.includes("High Range Radio")) {
			return "HR Radio PER";
		} else if (tempString.includes("Infrared Perception")) {
			return "IR Perception";		
		} else if (tempString.includes("Mental Awareness")) {
			return "Mental Awareness";	
		} else if (tempString.includes("Nightvision")) {
			return "Nightvision";	
		} else if (tempString.includes("Radar")) {
			return "Radar";	
		} else if (tempString.includes("Radio Perception/Transmission")) {
			return "Radio PER/Trans";
		} else if (tempString.includes("Radio Perception")) {
			return "Radio PER";	
		} else if (tempString.includes("Spatial Awareness")) {
			return "Spatial Awareness";	
		} else if (tempString.includes("Tracking")) {
			return "Enhanced Sense";
		} else if (tempString.includes("Ultrasonic Perception")) {
			return "Ultrasonic PER";
		} else if (tempString.includes("Ultraviolet Perception")) {
			return "UV Perception";		
		} else if (tempString.includes("SPD")) {
			return "Enhanced SPD";		
		} else if (tempString.includes("PER")) {
			return "Enhanced PER";		
		} else if (tempString.includes("STR")) {
			return "Enhanced STR";		
		} else if (tempString.includes("DEX")) {
			return "Enhanced DEX";		
		} else if (tempString.includes("CON")) {
			return "Enhanced CON";		
		} else if (tempString.includes("INT")) {
			return "Enhanced INT";		
		} else if (tempString.includes("EGO")) {
			return "Enhanced EGO";		
		} else if (tempString.includes("PRE")) {
			return "Enhanced PRE";		
		} else if (tempString.includes("OCV")) {
			return "Enhanced OCV";		
		} else if (tempString.includes("DCV")) {
			return "Enhanced DCV";		
		} else if (tempString.includes("OMCV")) {
			return "Enhanced OMCV";		
		} else if (tempString.includes("DMCV")) {
			return "Enhanced DMCV";
		} else if (lowerCaseString.includes("sight") || lowerCaseString.includes("hearing") || lowerCaseString.includes("smell") || lowerCaseString.includes("taste") || lowerCaseString.includes("touch") || lowerCaseString.includes("sense")) {
			return "Enhanced PER";
		} else if (lowerCaseString.includes("eating") || lowerCaseString.includes("immunity") || lowerCaseString.includes("longevity") || lowerCaseString.includes("safe in") || lowerCaseString.includes("breathing") || lowerCaseString.includes("sleeping")) {
			return "Life Support";
		} else if (lowerCaseString.includes("advantage")) {
			return "Independent Advantage";
		} else if (lowerCaseString.includes("worth of") || lowerCaseString.includes("powers") || lowerCaseString.includes("spells") || lowerCaseString.includes("abilities")) {
			return "To Be Determined";	
		} else {
			return "Unknown Effect";
		}
	}
	
	
	var isAttack = function (effect) {
		// For setting the attack state.
		const attackSet = new Set(["Blast", "Dispel", "Drain", "Entangle", "Healing", "HTH Attack", "HTH Killing Attack", "Mental Blast", "Mental Illusions", "Mind Control", "Mind Link", "Mind Scan", "Ranged Killing Attack", "Telekinesis", "Telepathy", "Transform"]);
		
		return attackSet.has(effect) ? true : false;
	}
	
	
	var getPowerDamageType = function (effect) {
		// For setting the attack state.
		const killingSet = new Set(["HTH Killing Attack", "Ranged Killing Attack"]);
		const normalSet = new Set(["Blast", "HTH Attack"]);
		const mentalSet = new Set(["Mental Blast", "Mental Illusions", "Mind Control", "Mind Link", "Mind Scan", "Telepathy"]);
		let damageType = null;
		
		if (killingSet.has(effect)) {
			damageType = "killing";
		} else if (mentalSet.has(effect)) {
			damageType = "mental";
		} else if (normalSet.has(effect)) {
			damageType = "normal";
		} else {
			damageType = "power";
		}
		
		return damageType;
	}
	
	
	var getPowerBaseCost = function(character, base, effect, text, bonus, option, script_name) {
		// For ordinary powers, this function simply returns the imported base cost.
		// For stat modification powers, this function assigns a base cost determined from the characteristic
		// and also awards those points as bonus points so that the character is not charged twice.
		// For 'to be determined' powers the function attempts to parse the base cost from the power's text.
		
		let powerBaseCost = parseInt(base);
		let bonusCP = parseInt(bonus);
		
		if (effect === "Base STR Mod") {
			powerBaseCost = parseInt(character.strength);
			bonusCP = bonusCP + powerBaseCost;
		} else if (effect === "Base Running Mod") {
			powerBaseCost = parseInt(character.running);
			bonusCP = bonusCP + powerBaseCost;
		} else if (effect === "Base Leaping Mod") {
			powerBaseCost = parseInt(Math.round(character.leaping/2));
			bonusCP = bonusCP + powerBaseCost;
		} else if (effect === "Base Swimming Mod") {
			powerBaseCost = parseInt(Math.round(character.swimming/2));
			bonusCP = bonusCP + powerBaseCost;
		} else if (effect === "Base Defense Mod") {
			if (option === "on") {
				// Determine pd cost. If character has takes No STUN triple cost over the base 2.
				if ((option === "on") && (character.pd > 1)) {
					powerBaseCost = parseInt(1 + (character.pd - 1)*3);
					bonusCP = bonusCP + powerBaseCost;
				} else {
					powerBaseCost = parseInt(character.pd*1);
					bonusCP = bonusCP + powerBaseCost;
				}
				
				// Add ed cost. If character has takes No STUN triple cost over the base 2.
				if ((option === "on") && (character.ed > 1)) {
					powerBaseCost = powerBaseCost + parseInt(1 + (character.ed - 1)*3);
					bonusCP = bonusCP + powerBaseCost;
				} else {
					powerBaseCost = powerBaseCost + parseInt(character.ed*1);
					bonusCP = bonusCP + powerBaseCost;
				}
			} else {
				powerBaseCost = parseInt(character.pd*1) + parseInt(character.ed*1);
				bonusCP = bonusCP + powerBaseCost;
			}
		} else if (effect === "Base PD Mod") {
			// If character has takes No STUN triple cost over the base 2.
			if ((option === "on") && (character.pd > 1)) {
				powerBaseCost = parseInt(1 + (character.pd - 1)*3);
				bonusCP = bonusCP + powerBaseCost;
			} else {
				powerBaseCost = parseInt(character.pd*1);
				bonusCP = bonusCP + powerBaseCost;
			}
		} else if (effect === "Base ED Mod") {
			// If character has takes No STUN triple cost over the base 2.
			if ((option === "on") && (character.ed > 1)) {
				powerBaseCost = parseInt(1 + (character.ed - 1)*3);
				bonusCP = bonusCP + powerBaseCost;
			} else {
				powerBaseCost = parseInt(character.ed*1);
				bonusCP = bonusCP + powerBaseCost;
			}
		} else if (effect === "To Be Determined") {
			// Workaround for when sometimes points reported as base are incorrect.
			if ((text.match(/^\d+|\d+\b|\d+(?=\w)/g) !== null) && (text.match(/^\d+|\d+\b|\d+(?=\w)/g) !== ""))  {
				powerBaseCost = text.match(/^\d+|\d+\b|\d+(?=\w)/g)[0];
			} else {
				// If the array came up empty, default to base cost.
				powerBaseCost = parseInt(base);
			}
		}
		
		if (bonus != bonusCP) {
			if(verbose) {
				sendChat(script_name, JSON.stringify(bonusCP - bonus) + " CP added to Bonus.");
			}
		}
		
		return [powerBaseCost, bonusCP];
	}
	
	
	var findAdvantages = function(tempString) {
		// Determine total limitations. This will take some doing.
		
		let advantages = 0;
		
		// Find half-integers. Replace larger ones first.
		advantages = advantages + ((tempString.match(/\+5 1\/2\)/g) || []).length)*5.5;
		tempString = tempString.replace("+5 1/2)","");
		advantages = advantages + ((tempString.match(/\+4 1\/2\)/g) || []).length)*4.5;
		tempString = tempString.replace("+4 1/2)","");
		advantages = advantages + ((tempString.match(/\+3 1\/2\)/g) || []).length)*3.5;
		tempString = tempString.replace("+3 1/2)","");
		advantages = advantages + ((tempString.match(/\+2 1\/2\)/g) || []).length)*2.5;
		tempString = tempString.replace("+2 1/2)","");
		advantages = advantages + ((tempString.match(/\+1 1\/2\)/g) || []).length)*1.5;
		tempString = tempString.replace("+1 1/2)","");
		advantages = advantages + ((tempString.match(/\+1\/2\)/g) || []).length)*0.5;
		tempString = tempString.replace("+1/2)","");
		
		// Find three-quarter integers. Replace larger ones first.
		advantages = advantages + ((tempString.match(/\+5 3\/4\)/g) || []).length)*5.75;
		tempString = tempString.replace("+5 3/4)","");
		advantages = advantages + ((tempString.match(/\+4 3\/4\)/g) || []).length)*4.75;
		tempString = tempString.replace("+4 3/4)","");
		advantages = advantages + ((tempString.match(/\+3 3\/4\)/g) || []).length)*3.75;
		tempString = tempString.replace("+3 3/4)","");
		advantages = advantages + ((tempString.match(/\+2 3\/4\)/g) || []).length)*2.75;
		tempString = tempString.replace("+2 3/4)","");
		advantages = advantages + ((tempString.match(/\+1 3\/4\)/g) || []).length)*1.75;
		tempString = tempString.replace("+1 3/4)","");
		advantages = advantages + ((tempString.match(/\+3\/4\)/g) || []).length)*0.75;
		tempString = tempString.replace("+3/4)","");
		
		// Find quarter integers. Replace larger ones first.
		advantages = advantages + ((tempString.match(/\+5 1\/4\)/g) || []).length)*5.25;
		tempString = tempString.replace("+5 1/4)","");
		advantages = advantages + ((tempString.match(/\+4 1\/4\)/g) || []).length)*4.25;
		tempString = tempString.replace("+4 1/4)","");
		advantages = advantages + ((tempString.match(/\+3 1\/4\)/g) || []).length)*3.25;
		tempString = tempString.replace("+3 1/4)","");
		advantages = advantages + ((tempString.match(/\+2 1\/4\)/g) || []).length)*2.25;
		tempString = tempString.replace("+2 1/4)","");
		advantages = advantages + ((tempString.match(/\+1 1\/4\)/g) || []).length)*1.25;
		tempString = tempString.replace("+1 1/4)","");
		advantages = advantages + ((tempString.match(/\+1\/4\)/g) || []).length)*0.25;
		tempString = tempString.replace("+1/4)","");
		
		// Find whole integers. Replace larger ones first.
		advantages = advantages + ((tempString.match(/\+6\)/g) || []).length)*6;
		tempString = tempString.replace("+6)","");
		advantages = advantages + ((tempString.match(/\+5\)/g) || []).length)*5;
		tempString = tempString.replace("+5)","");
		advantages = advantages + ((tempString.match(/\+4\)/g) || []).length)*4;
		tempString = tempString.replace("+4)","");
		advantages = advantages + ((tempString.match(/\+3\)/g) || []).length)*3;
		tempString = tempString.replace("+3)","");
		advantages = advantages + ((tempString.match(/\+2\)/g) || []).length)*2;
		tempString = tempString.replace("+2)","");
		advantages = advantages + ((tempString.match(/\+1\)/g) || []).length)*1;
		tempString = tempString.replace("+1)","");
		
		return advantages;
	}
		
	var findLimitations = function(tempString) {
		// Determine total limitations. This will take some doing.
		
		let limitations = 0;
		
		// Find half-integers. Replace larger ones first.
		limitations = limitations + ((tempString.match(/-5 1\/2\)/g) || []).length)*5.5;
		tempString = tempString.replace("-5 1/2)","");
		limitations = limitations + ((tempString.match(/-4 1\/2\)/g) || []).length)*4.5;
		tempString = tempString.replace("-4 1/2)","");
		limitations = limitations + ((tempString.match(/-3 1\/2\)/g) || []).length)*3.5;
		tempString = tempString.replace("-3 1/2)","");
		limitations = limitations + ((tempString.match(/-2 1\/2\)/g) || []).length)*2.5;
		tempString = tempString.replace("-2 1/2)","");
		limitations = limitations + ((tempString.match(/-1 1\/2\)/g) || []).length)*1.5;
		tempString = tempString.replace("-1 1/2)","");
		limitations = limitations + ((tempString.match(/-1\/2\)/g) || []).length)*0.5;
		tempString = tempString.replace("-1/2)","");
		
		// Find three-quarter integers. Replace larger ones first.
		limitations = limitations + ((tempString.match(/-5 3\/4\)/g) || []).length)*5.75;
		tempString = tempString.replace("-5 3/4)","");
		limitations = limitations + ((tempString.match(/-4 3\/4\)/g) || []).length)*4.75;
		tempString = tempString.replace("-4 3/4)","");
		limitations = limitations + ((tempString.match(/-3 3\/4\)/g) || []).length)*3.75;
		tempString = tempString.replace("-3 3/4)","");
		limitations = limitations + ((tempString.match(/-2 3\/4\)/g) || []).length)*2.75;
		tempString = tempString.replace("-2 3/4)","");
		limitations = limitations + ((tempString.match(/-1 3\/4\)/g) || []).length)*1.75;
		tempString = tempString.replace("-1 3/4)","");
		limitations = limitations + ((tempString.match(/-3\/4\)/g) || []).length)*0.75;
		tempString = tempString.replace("-3/4)","");
		
		// Find quarter integers. Replace larger ones first.
		limitations = limitations + ((tempString.match(/-5 1\/4\)/g) || []).length)*5.25;
		tempString = tempString.replace("-5 1/4)","");
		limitations = limitations + ((tempString.match(/-4 1\/4\)/g) || []).length)*4.25;
		tempString = tempString.replace("-4 1/4)","");
		limitations = limitations + ((tempString.match(/-3 1\/4\)/g) || []).length)*3.25;
		tempString = tempString.replace("-3 1/4)","");
		limitations = limitations + ((tempString.match(/-2 1\/4\)/g) || []).length)*2.25;
		tempString = tempString.replace("-2 1/4)","");
		limitations = limitations + ((tempString.match(/-1 1\/4\)/g) || []).length)*1.25;
		tempString = tempString.replace("-1 1/4)","");
		limitations = limitations + ((tempString.match(/-1\/4\)/g) || []).length)*0.25;
		tempString = tempString.replace("-1/4)","");
		
		// Find whole integers. Replace larger ones first.
		limitations = limitations + ((tempString.match(/-6\)/g) || []).length)*6;
		tempString = tempString.replace("-6)","");
		limitations = limitations + ((tempString.match(/-5\)/g) || []).length)*5;
		tempString = tempString.replace("-5)","");
		limitations = limitations + ((tempString.match(/-4\)/g) || []).length)*4;
		tempString = tempString.replace("-4)","");
		limitations = limitations + ((tempString.match(/-3\)/g) || []).length)*3;
		tempString = tempString.replace("-3)","");
		limitations = limitations + ((tempString.match(/-2\)/g) || []).length)*2;
		tempString = tempString.replace("-2)","");
		limitations = limitations + ((tempString.match(/-1\)/g) || []).length)*1;
		tempString = tempString.replace("-1)","");
		
		return limitations;
	}
	
	
	var isAoE = function(inputString) {	
		// Search advantages for any that indicate an Area of Effect power.
		// Written so as to be able to look for more than just "area" but this may be enough.
		inputString = inputString.replace(/\W/g, " ");
		inputString = inputString.toLowerCase();
		
		const searchSet = new Set(["area"]);
		let setOfWords = new Set(inputString.split(" "));
		let intersection = new Set([...setOfWords].filter(x => searchSet.has(x)));
		let answer = false;
		
		if (intersection.size != 0) {
			answer = true;
		}
		
		return answer;
	}
	
	
	var requiresRoll = function(inputString) {	
		// Determine if the power as an activation roll and find it if it is simple.
		let lowerCaseString = inputString.toLowerCase();
		let detailString;
		let startPosition;
		let endPosition;
		let answer = false;
		let value = 18;
		let searchSet = new Set(["skill", "characteristic", "ps", "ks", "ss", "attack", "per"]);
		let setOfWords;
		let intersection;
		
		if (lowerCaseString.includes("requires a roll")) {
			
			answer = true;
			
			// Attempt to obtain the skill roll needed if it is a simple activation roll. The others
			// would require guesses, which means we need to leave the decision to the players.
			
			startPosition = lowerCaseString.indexOf("requires a roll");
			startPosition = lowerCaseString.indexOf("(", startPosition);
			endPosition = lowerCaseString.indexOf(")", startPosition);
			detailString = lowerCaseString.slice(startPosition, endPosition);
			setOfWords = new Set((detailString.replace(/\W/g, " ").split(" ")));
			intersection = new Set([...setOfWords].filter(x => searchSet.has(x)));
			
			if (intersection.size === 0) {
				endPosition = detailString.indexOf("-", 0);
				value = detailString.slice(0, endPosition);
				value = value.replace(/\D/g, '');
				if (value.length !== 0) {
					value = Number(value);
				}
			}
		}
		
		return {
			"hasRoll": answer,
			"skillRoll": value
		}
	}
	
	
	var reducedDCV = function(inputString) {	
		// Search for the Concentration limitation.
		inputString = inputString.toLowerCase();
		let answer;
		
		if (inputString.includes("0 dcv")) {
			answer = "zero";
		} else if (inputString.includes("1/2 dcv")) {
			answer = "half";
		} else {
			answer = "full";
		}
		
		return answer;
	}
	
	
	var reducedRMod = function(inputString) {	
		// Search for half or zero range modifier advantages.
		inputString = inputString.toLowerCase();
		let answer;
		
		if (inputString.includes("no range modifier")) {
			answer = "zero";
		} else if (inputString.includes("half range modifier")) {
			answer = "half";
		} else {
			answer = "STD";
		}
		
		return answer;
	}
	
	
	var getWeaponStrMin = function (weaponString, script_name) {
		// Parse weapon text and look for one of three strings used
		// by Hero Designer to record a weapon strength minimum.
		let strengthMin = 0;
		let strengthString;
		let startParenthesis;
		let endParenthesis;
		let valueString;
		let defaultStrength = 0;
		
		if (weaponString !== "") {
			if (weaponString.includes("STR Minimum")) {
				tempPosition = weaponString.indexOf("STR Minimum");
				startParenthesis = weaponString.indexOf("(", tempPosition + 11);
				endParenthesis = weaponString.indexOf(")", tempPosition + 11);
				strengthString = weaponString.slice(tempPosition + 11, startParenthesis);
				
				// Get the limitation value in case no strength is available.
				valueString = weaponString.slice(startParenthesis+1, endParenthesis);
				valueString = valueString.replace(/\s/g, "");
				
				switch(valueString) {
					case "-1/4": 
						defaultStrength = 4;
						break;
					case "-1/2":
						defaultStrength = 9;
						break;
					case "-3/4":
						defaultStrength = 14;
						break;
					case "-1":
						defaultStrength = 19;
						break;
					default:
						defaultStrength = 1;
				}
				
				// Check to see if a strength range is used:
				if (strengthString.includes("-")) {
					tempPosition = strengthString.indexOf("-");
					strengthString = strengthString.substring(0, tempPosition);
				}
				
				strengthMin = parseInt(strengthString.replace(/\D/g, ""))||defaultStrength;			

			} else if (weaponString.includes("STR Min")) {
				tempPosition = weaponString.indexOf("STR Min");
				startParenthesis = weaponString.indexOf("(", tempPosition + 8);
				endParenthesis = weaponString.indexOf(")", tempPosition + 8);
				strengthString = weaponString.slice(tempPosition + 8, startParenthesis);
				
				// Get the limitation value in case no strength is available.
				valueString = weaponString.slice(startParenthesis+1, endParenthesis);
				valueString = valueString.replace(/\s/g, "");
				
				switch(valueString) {
					case "-1/4": 
						defaultStrength = 4;
						break;
					case "-1/2":
						defaultStrength = 9;
						break;
					case "-3/4":
						defaultStrength = 14;
						break;
					case "-1":
						defaultStrength = 19;
						break;
					default:
						defaultStrength = 1;
				}
				
				// Check to see if a strength range is used:
				if (strengthString.includes("-")) {
					tempPosition = strengthString.indexOf("-");
					strengthString = strengthString.substring(0, tempPosition);
				}
				
				strengthMin = parseInt(strengthString.replace(/\D/g, ""))||defaultStrength;	
				
			} else {
				strengthMin = 0;
			}
		} else {
			strengthMin = 0;
		}
		
		return strengthMin;
	}
	
	
	var getWeaponRange = function (rangeString, strength, mass, script_name) {
		// Parses range string for numeric characters.
		// If "var" is found, calls the range based strength function "calculateRange".
		
		let range = 0;
		
		if (rangeString !== "") {
			if (rangeString.includes("var")) {
				range = calculateRange(strength, mass);
			} else {
				range = parseInt(rangeString.replace(/[^\d.-]/g, ""));
			}
		} else {
			range = 0;
		}
		
		return range;
	}
	
	
	var getWeaponStrength = function (strengthMin, strengthMax, script_name) {
		// Returns STR in increments of 5 above strengthMin up to strengthMax.
		
		let differenceDC = 0;
		let strength = strengthMax;
		
		if (strengthMax >= strengthMin) {
			differenceDC = Math.floor( (strengthMax - strengthMin)/5 );
			strength = strengthMin + 5 * differenceDC;
		}
		
		return strength;
	}
	
	
	var getDamage = function (damageString, script_name) {
		// Parses damageString for damage dice.
		
		let damage = "0";
		let lastIndex = 0;
		
		// Remove dice in w/STR since we'll calculated it.
		if (damageString.includes(" w/STR")) {
			damageString = damageString.replace(/\([^()]*\)/g, "");
		}
		
		// Separate joined dice if present.
		if ((damageString.match(/d6/g) || []).length > 1) {
			damageString = damageString.replace("d6", "d6+");
			lastIndex = damageString.lastIndexOf("d6+");
			damageString = damageString.substring(0, lastIndex) + "d6" + damageString.substring(lastIndex + 2);
		}
		
		// Look for (xd6 w/STR) and use that. No longer used as of sheet 2.51.
		// if (damageString.includes(" w/STR")) {
		// 	damageString = damageString.match(/\(([^)]*)\)/)[1];
		// 	damageString = damageString.replace(" w/STR", "");
		// }
		
		// Make sure the 1/2d6 is a 1d3.
		if (damageString.includes(" 1/2d6")) {
			damage = damageString.replace(" 1/2d6", "d6+d3");			
		} else if (damageString.includes("1/2d6")) {
			damage = damageString.replace("1/2d6", "d3");
		} else {
			damage = damageString;
		}
		
		return damage;
	}
	
	
	var checkDamageBySTR = function (damageString, script_name) {
		damageBySTR = false;
		
		if (damageString.includes(" w/STR")) {
			damageBySTR = true;
		}
		
		return damageBySTR;
	}
	
	
	var getAdvantage = function (weaponString, script_name) {
		// See 6E2 98 for a list of advantages that affect weapon damage.
		let advantage = 0;
		let temp = 0;
		let searchString = "";
		
		weaponString = weaponString.toLowerCase();
		
		searchString = "area of effect";
		advantage += getSingleAdvantage (weaponString, searchString);
		
		searchString = "armor piercing";
		advantage += getSingleAdvantage (weaponString, searchString);
		
		searchString = "autofire";
		advantage += getSingleAdvantage (weaponString, searchString);
		
		searchString = "attack versus alternate defense";
		advantage += getSingleAdvantage (weaponString, searchString);
		
		searchString = "boostable";
		advantage += getSingleAdvantage (weaponString, searchString);
		
		if (weaponString.includes("constant")) {
			advantage += 0.5;
		}
		
		searchString = "cumulative";
		advantage += getSingleAdvantage (weaponString, searchString);
		
		searchString = "damage over time";
		advantage += getSingleAdvantage (weaponString, searchString);
		
		if (weaponString.includes("does body")) {
			advantage += 1;
		}
		
		if (weaponString.includes("does knockback")) {
			advantage += 0.25;
		}
		
		if (weaponString.includes("double knockback")) {
			advantage += 0.5;
		}
		
		if (weaponString.includes("+1 increased stun multiplier")) {
			advantage += 0.25;
		} else if (weaponString.includes("+2 increased stun multiplier")) {
			advantage += 0.50;
		}
		
		searchString = "penetrating";
		advantage += getSingleAdvantage (weaponString, searchString);
		
		if (weaponString.includes("range based on str")) {
			advantage += 0.25;
		}
		
		if (weaponString.includes("sticky")) {
			advantage += 0.5;
		}
		
		searchString = "time limit";
		advantage += getSingleAdvantage (weaponString, searchString);
		
		searchString = "transdimensional";
		advantage += getSingleAdvantage (weaponString, searchString);
		
		searchString = "trigger";
		advantage += getSingleAdvantage (weaponString, searchString);
		
		if (weaponString.includes("uncontrolled")) {
			advantage += 0.5;
		}
		
		searchString = "variable advantage";
		advantage += getSingleAdvantage (weaponString, searchString);
		
		searchString = "variable special effects";
		advantage += getSingleAdvantage (weaponString, searchString);
		
		return advantage;
	}
	
	var getSingleAdvantage = function(weaponString, searchString) {
		let advantage = 0;
		
		if (weaponString.includes(searchString)) {
			searchString = weaponString.slice(weaponString.indexOf(searchString) + searchString.length);
			searchString = searchString.match(/\(([^)]+)\)/)[0];
			
			advantage = findAdvantages(searchString);
			
			if (advantage < 0) {
				advantage = 0;
			}
		}
		
		return advantage;
	}
	
	
	var calculateRange = function(strength, mass) {
		// Determines range based on strength.
		let liftCapability;
		let freeCapability;
		let effectiveStrength;
		let range;
		
		// First calculate carrying capacity.
		switch (strength) {
			case 0:	liftCapability = 0;
					break;
			case 1:	liftCapability = 8;
					break;
			case 2:	liftCapability = 16;
					break;
			case 3:	liftCapability = 25;
					break;
			case 4:	liftCapability = 38;
					break;
			default: liftCapability=Math.round(25*Math.pow(2,(strength/5)));
		}
				
		// Subtract the thrown weight from capacity.
		freeCapability = liftCapability-mass;
		
		// Determine unused strength and calculate range.
		if (freeCapability <= 0) {
			range = 0;
		} else {
			if (freeCapability <= 8) {
				effectiveStrength = 1;
				range = 2;
			} else if (freeCapability <= 16) {
				effectiveStrength = 2;
				range = 3;
			} else if (freeCapability <= 25) {
				effectiveStrength = 3;
				range = 4;
			} else if (freeCapability <= 38) {
				effectiveStrength = 4;
				range = 6;
			} else {
				effectiveStrength = 5 * Math.log2(freeCapability/25);
				range = Math.round(8 * effectiveStrength/5);
			}
		}
		
		return parseInt(Math.round(range));
	}
	
	
	var getItemMass = function(massString, script_name) {
		// Remove units from mass and round to one decimal.
		let mass = 0;
		
		if (massString !== "") {
			massString = parseFloat(massString.replace(/[^\d.-]/g, ""));
			mass = Math.round(10*massString)/10;
		}
		
		return mass;
	}
	
	
	var getStunModifier = function(itemString, script_name) {
		// Parse string for STUN multiple.
		let stunModifier = 0;
		let tempPosition;
		
		if ((typeof itemString !== "undefined") && (itemString.length !== 0)) {
			if (itemString.includes("Increased STUN Multiplier")) {
				tempPosition = itemString.indexOf("Increased STUN Multiplier");
				stunModifier = parseInt(itemString.substr(tempPosition-3, 2));
			} else if (itemString.includes("Decreased STUN Multiplier")) {
				tempPosition = itemString.indexOf("Decreased STUN Multiplier");
				stunModifier = parseInt(itemString.substr(tempPosition-3, 2));
			}
		}
		
		return stunModifier;
	}
	
	
	var getOCVmodifier = function(weaponString, script_name) {
		// Parse weapon string for OCV modifier or penalty.
		let ocvModifier = 0;
		let tempPosition;
		let subString;
		
		// First, remove Range Modifier OCV if present.
		weaponString = weaponString.replace("OCV modifier","");
		
		// Then search for OCV bonus.
		if ((weaponString !== "") && (weaponString.includes("OCV"))) {
			tempPosition = weaponString.indexOf("OCV");
			subString = weaponString.slice(0, tempPosition);
			
			// If there is a modifier before the OCV entry, drop characters up to that point.
			if (subString.includes(")")) {
				tempPosition = subString.lastIndexOf(")");
				subString = subString.substr(tempPosition);
			}
			
			subString = subString.replace(/[^\d-]/g, "");
			ocvModifier = parseInt(subString);				
		} 
		
		return ocvModifier;
	}
	
	
	var heroRoundUp = function(numerator, denominator) {
		
		if (denominator > 0) {
			const intermediate = numerator/denominator;
			const remainder = Math.floor((numerator % denominator)*10)/10;
			
			if (remainder < 0.5) {
				return Math.floor(intermediate);
			} else {
				return Math.ceil(intermediate);
			}
		}
		
		// Error. Return unmodified value.
		return numerator;
	}
	
	
	var heroRoundDown = function(numerator, denominator) {
		
		if (denominator > 0) {
			const intermediate = numerator/denominator;
			const remainder = Math.floor((numerator % denominator)*10)/10;
			
			if (remainder < 0.6) {
				return Math.floor(intermediate);
			} else {
				return Math.ceil(intermediate);
			}
		}
		
		// Error. Return unmodified value.
		return numerator;
	}
	
	
/* **************************************** */
/* ***  END Importing Functions         *** */
/* **************************************** */
	
	// TEST
	const createSingleWriteQueue = (attributes) => {
		// this is the list of trigger attributes that will trigger class recalculation, as of 5e OGL 2.5 October 2018
		// (see on... handler that calls update_class in sheet html)
		// these are written first and individually, since they trigger a lot of changes
		let class_update_triggers = [
			'strength'];
	
		// set class first, everything else is alphabetical
		let classAttribute = class_update_triggers.shift();
		class_update_triggers.sort();
		class_update_triggers.unshift(classAttribute);
	
		// write in deterministic order (class first, then alphabetical) 
		
		let items = [];
		
		for (trigger of class_update_triggers) {
			let value = attributes[trigger];
			if ((value === undefined) || (value === null)) {
				continue;
			}
			items.push([trigger, value]);
			log('hero: trigger attribute ' + trigger);
			delete attributes[trigger];
		} 
		
		return items; 
	}
	
	
	const reportReady = (character) => {
		// From Beyond. Left as-is.
		//
		// TODO this is nonsense.  we aren't actually done importing, because notifications in the character sheet are firing for quite a while
		// after we finish changing things (especially on first import) and we have no way (?) to wait for it to be done.   These are not sheet workers
		// on which we can wait.
		// sendChat(script_name, '<div style="'+style+'">Import of <b>' + character.character_name + '</b> is ready at https://journal.roll20.net/character/' + object.id +'</div>', null, {noarchive:true});
		return;
	}


	const blankIfNull = (input) => {
		return (input === null)?"":input;
	}

	
	const ucFirst = (string) => {
		if(string == null) return string;
		return string.charAt(0).toUpperCase() + string.slice(1);
	};


	const sendConfigMenu = (player, first) => {
		let playerid = player.id;
		let prefix = (state[state_name][playerid].config.prefix !== '') ? state[state_name][playerid].config.prefix : '[NONE]';
		let prefixButton = makeButton(prefix, '!hero --config prefix|?{Prefix}', buttonStyle);
		let suffix = (state[state_name][playerid].config.suffix !== '') ? state[state_name][playerid].config.suffix : '[NONE]';
		let suffixButton = makeButton(suffix, '!hero --config suffix|?{Suffix}', buttonStyle);
		let overwriteButton = makeButton(state[state_name][playerid].config.overwrite, '!hero --config overwrite|'+!state[state_name][playerid].config.overwrite, buttonStyle);
		let debugButton = makeButton(state[state_name][playerid].config.debug, '!hero --config debug|'+!state[state_name][playerid].config.debug, buttonStyle);
		let optionMaximumsButton = makeButton(state[state_name][playerid].config.maximums, '!hero --config maximums|'+!state[state_name][playerid].config.maximums, buttonStyle);
		let optionLiteracyButton = makeButton(state[state_name][playerid].config.literacy, '!hero --config literacy|'+!state[state_name][playerid].config.literacy, buttonStyle);
		let optionSuperENDButton = makeButton(state[state_name][playerid].config.superEND, '!hero --config superEND|'+!state[state_name][playerid].config.superEND, buttonStyle);
		let optionLocationsButton = makeButton(state[state_name][playerid].config.locations, '!hero --config locations|'+!state[state_name][playerid].config.locations, buttonStyle);
	
		let listItems = [
			'<span style="float: left; margin-top: 6px;">Overwrite:</span> '+overwriteButton+'<br /><small style="clear: both; display: inherit; color: white;">CAUTION: overwrites an existing character sheet that has a matching character name.</small>',
			'<span style="float: left; margin-top: 6px;">Prefix:</span> '+prefixButton,
			'<span style="float: left; margin-top: 6px;">Suffix:</span> '+suffixButton,
			'<span style="float: left; margin-top: 6px;">Verbose Report:</span> '+debugButton,
		]
	
		let list = '<b>Importer</b>'+makeList(listItems, 'overflow: hidden; list-style: none; padding: 0; margin: 0;', 'overflow: hidden; margin-top: 5px;');
		
		let inPlayerJournalsButton = makeButton(player.get('displayname'), "", buttonStyle);
		let controlledByButton = makeButton(player.get('displayname'), "", buttonStyle);
		if(playerIsGM(playerid)) {
			let players = "";
			let playerObjects = findObjs({
				_type: "player",
			});
			for(let i = 0; i < playerObjects.length; i++) {
				players += '|'+playerObjects[i]['attributes']['_displayname']+','+playerObjects[i].id;
			}
	
			let ipj = state[state_name][playerid].config.inplayerjournals == "" ? '[NONE]' : state[state_name][playerid].config.inplayerjournals;
			if(ipj != '[NONE]' && ipj != 'all') ipj = getObj('player', ipj).get('displayname');
			inPlayerJournalsButton = makeButton(ipj, '!hero --config inplayerjournals|?{Player|None,[NONE]|All Players,all'+players+'}', buttonStyle);
			let cb = state[state_name][playerid].config.controlledby == "" ? '[NONE]' : state[state_name][playerid].config.controlledby;
			if(cb != '[NONE]' && cb != 'all') cb = getObj('player', cb).get('displayname');
			controlledByButton = makeButton(cb, '!hero --config controlledby|?{Player|None,[NONE]|All Players,all'+players+'}', buttonStyle);
		}
	
		let sheetListItems = [
			'<span style="float: left; margin-top: 6px; color: white;">In Player Journal:</span> ' + inPlayerJournalsButton,
			'<span style="float: left; margin-top: 6px;">Player Control:</span> ' + controlledByButton,
			'<span style="float: left; margin-top: 6px;">Use Char Maximums:</span> ' + optionMaximumsButton,
			'<span style="float: left; margin-top: 6px;">Literacy Costs CP:</span> ' + optionLiteracyButton,
			'<span style="float: left; margin-top: 6px;">Super-Heroic END:</span> ' + optionSuperENDButton,
			'<span style="float: left; margin-top: 6px;">Use Hit Locations:</span> ' + optionLocationsButton
		]
	
		let sheetList = '<hr><b>Character Sheet</b>'+makeList(sheetListItems, 'overflow: hidden; list-style: none; padding: 0; margin: 0;', 'overflow: hidden; margin-top: 5px;');
		
		// Set verbose (debug) option
		let debug = "";
		if(state[state_name][playerid].config.debug){
			// The original version here would generate debug option buttons. For now, we will only change the verbose reporting state.
			verbose = true;
		} else {
			verbose = false;
		}
		
		// Set characteristic maximums option
		if(state[state_name][playerid].config.maximums){
			defaultAttributes.useCharacteristicMaximums = "on";
		} else {
			defaultAttributes.useCharacteristicMaximums = 0;
		}
		
		// Set literacy cost option
		if(state[state_name][playerid].config.literacy){
			defaultAttributes.optionLiteracyCostsPoints = "on";
		} else {
			defaultAttributes.optionLiteracyCostsPoints = 0;
		}
		
		// Set super-heroic END option
		if(state[state_name][playerid].config.superEND){
			defaultAttributes.optionSuperHeroicEndurance = "on";
		} else {
			defaultAttributes.optionSuperHeroicEndurance = 0;
		}
		
		// Set hit location system option
		if(state[state_name][playerid].config.locations){
			defaultAttributes.optionHitLocationSystem = "on";
		} else {
			defaultAttributes.optionHitLocationSystem = 0;
		}
	
		let resetButton = makeButton('Reset', '!hero --reset', altButtonStyle + ' margin: auto; width: 90%; display: block; float: none;');
	
		//let title_text = (first) ? script_name + ' First Time Setup' : script_name + ' Config';
		let title_text = (first) ? 'HD Importer First Time Setup' : 'HD Importer Configuration';
		let text = '<div style="'+style+'">'+makeTitle(title_text)+list+sheetList+debug+'<hr>'+resetButton+'</div>';
	
		sendChat(script_name, '/w "' + player.get('displayname') + '" ' + text, null, {noarchive:true});
	};


	const sendHelpMenu = (player, first) => {
		let configButton = makeButton('Config', '!hero --config', altButtonStyle+' margin: auto; width: 90%; display: block; float: none;');
	
		let listItems = [
			'<span style="text-decoration: underline; font-size: 90%; color: #fff990; font-style: bold;">!hero --help</span><br />Shows this menu.',
			'<span style="text-decoration: underline; font-size: 90%; color: #fff990; font-style: bold;">!hero --config</span><br />Shows the configuration menu. (GM only)',
			'<span style="text-decoration: underline; font-size: 90%; color: #fff990; font-style: bold;">!hero --import [CHARACTER JSON]</span><br />Imports a character from <a style="color: orange;" href="https://www.herogames.com/store/product/1-hero-designer/" target="_blank">Hero Designer</a>.',
		];
	
		let command_list = makeList(listItems, 'list-style: none; padding: 0; margin: 0;');
	
		let text = '<div style="'+style+'">';
		//text += makeTitle(script_name + ' Help');
		text += makeTitle('HD Importer Help');
		text += '<p>Export a character in <a style="color: orange;" href="https://www.herogames.com/store/product/1-hero-designer/" target="_blank">Hero Designer</a> using the <a style="color: orange;" href="https://github.com/Roll20/roll20-api-scripts/tree/master/HeroSystem6eHeroic_HDImporter/1.0" target="_blank">HeroSystem6eHeroic.hde</a> format.</p>';
		text += '<p>Locate and open the exported .txt file in a text editor. Copy its entire contents and paste them into the Roll20 chat window. Hit enter.</p>';
		text += '<p>For more information see the documentation page in the HDImporter <a style="color: orange;" href="https://github.com/Roll20/roll20-api-scripts/tree/master/HeroSystem6eHeroic_HDImporter" target="_blank">Github</a> repository.</p>';
		text += '<hr>';
		text += '<b>Commands:</b>'+command_list;
		text += '<hr>';
		text += configButton;
		text += '</div>';
	
		sendChat(script_name, '/w "'+ player.get('displayname') + '" ' + text, null, {noarchive:true});
	};


	const makeTitle = (title) => {
		return '<h3 style="margin-bottom: 10px; color: yellow;">'+title+'</h3>';
	};


	const makeButton = (title, href, style) => {
		return '<a style="'+style+'" href="'+href+'">'+title+'</a>';
	};
	

	const makeList = (items, listStyle, itemStyle) => {
		let list = '<ul style="'+listStyle+'">';
		items.forEach((item) => {
			list += '<li style="'+itemStyle+'">'+item+'</li>';
		});
		list += '</ul>';
		return list;
	};


	const replaceChars = (text) => {
		text = text.replace('\&rsquo\;', '\'').replace('\&mdash\;','—').replace('\ \;',' ').replace('\&hellip\;','…');
		text = text.replace('\&nbsp\;', ' ');
		text = text.replace('\û\;','û').replace('’', '\'').replace(' ', ' ');
		text = text.replace(/<li[^>]+>/gi,'• ').replace(/<\/li>/gi,'');
		text = text.replace(/\r\n(\r\n)+/gm,'\r\n');
		return text;
	};


	const getRepeatingRowIds = (section, attribute, matchValue, index) => {
		let ids = [];
		if(state[state_name][hero_caller.id].config.overwrite) {
			let matches = findObjs({ type: 'attribute', characterid: object.id })
				.filter((attr) => {
					return attr.get('name').indexOf('repeating_'+section) !== -1 && attr.get('name').indexOf(attribute) !== -1 && attr.get('current') == matchValue;
				});
			for(let i in matches) {
				let row = matches[i].get('name').replace('repeating_'+section+'_','').replace('_'+attribute,'');
				ids.push(row);
			}
			if(ids.length == 0) ids.push(generateRowID());
		}
		else ids.push(generateRowID());

		if(index == null) return ids;
		else return ids[index] == null && index >= 0 ? generateRowID() : ids[index];
	}

	
	// Return an array of objects according to key, value, or key and value matching, optionally ignoring objects in array of names
	const getObjects = (obj, key, val, except) => {
		except = except || [];
		let objects = [];
		for (let i in obj) {
			if (!obj.hasOwnProperty(i)) continue;
			if (typeof obj[i] == 'object') {
				if (except.indexOf(i) != -1) {
					continue;
				}
				objects = objects.concat(getObjects(obj[i], key, val));
			} else
			//if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
			if (i == key && obj[i] == val || i == key && val == "") { //
				objects.push(obj);
			} else if (obj[i] == val && key == ""){
				//only add if the object is not already in the array
				if (objects.lastIndexOf(obj) == -1){
					objects.push(obj);
				}
			}
		}
		return objects;
	};
	
	// This section from Beyond is not used in HS6eH_HDImporter, but may be useful in future.
	//
	// Find an existing repeatable item with the same name, or generate new row ID
	// 	const getOrMakeRowID = (character,repeatPrefix,name) => {
	// 		// Get list of all of the character's attributes
	// 		let attrObjs = findObjs({ _type: "attribute", _characterid: character.get("_id") });
	// 
	// 		let i = 0;
	// 		while (i < attrObjs.length)
	// 		{
	// 			// If this is a feat taken multiple times, strip the number of times it was taken from the name
	// 			let attrName = attrObjs[i].get("current").toString();
	// 			 if (regexIndexOf(attrName, / x[0-9]+$/) !== -1)
	// 			 attrName = attrName.replace(/ x[0-9]+/,"");
	// 
	// 			 if (attrObjs[i].get("name").indexOf(repeatPrefix) !== -1 && attrObjs[i].get("name").indexOf("_name") !== -1 && attrName === name)
	// 			 return attrObjs[i].get("name").substring(repeatPrefix.length,(attrObjs[i].get("name").indexOf("_name")));
	// 			 i++;
	// 			i++;
	// 		}
	// 		return generateRowID();
	// 	};


	const generateUUID = (function() {
		let a = 0, b = [];
		return function() {
			let c = (new Date()).getTime() + 0, d = c === a;
			a = c;
			for (var e = new Array(8), f = 7; 0 <= f; f--) {
				e[f] = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(c % 64);
				c = Math.floor(c / 64);
			}
			c = e.join("");
			if (d) {
				for (f = 11; 0 <= f && 63 === b[f]; f--) {
					b[f] = 0;
				}
				b[f]++;
			} else {
				for (f = 0; 12 > f; f++) {
					b[f] = Math.floor(64 * Math.random());
				}
			}
			for (f = 0; 12 > f; f++){
				c += "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(b[f]);
			}
			return c;
		};
	}());


	const generateRowID = function() {
		"use strict";
		return generateUUID().replace(/_/g, "Z");
	};


	const regexIndexOf = (str, regex, startpos) => {
		let indexOf = str.substring(startpos || 0).search(regex);
		return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
	};


	const pre_log = (message) => {
		log('---------------------------------------------------------------------------------------------');
		log(message);
		log('---------------------------------------------------------------------------------------------');
	};


	const checkInstall = function() {
		if(!_.has(state, state_name)){
			state[state_name] = state[state_name] || {};
		}
		setDefaults();
	};

	
	const setDefaults = (reset) => {
		const defaults = {
			overwrite: false,
			debug: false,
			prefix: '',
			suffix: '',
			inplayerjournals: '',
			controlledby: '',
			maximums: false,
			literacy: false,
			superEND: false,
			locations: false
		};
	
		let playerObjects = findObjs({
			_type: "player",
		});
		playerObjects.forEach((player) => {
			if(!state[state_name][player.id]) {
				state[state_name][player.id] = {};
			}
	
			if(!state[state_name][player.id].config) {
				state[state_name][player.id].config = defaults;
			}
	
			for(let item in defaults) {
				if(!state[state_name][player.id].config.hasOwnProperty(item)) {
					state[state_name][player.id].config[item] = defaults[item];
				}
			}
	
			if(!state[state_name][player.id].config.hasOwnProperty('firsttime')){
				if(!reset){
					sendConfigMenu(player, true);
				}
				state[state_name][player.id].config.firsttime = false;
			}
		});
	};

	
})();