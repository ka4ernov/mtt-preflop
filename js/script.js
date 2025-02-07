"use strict";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sntxkckjafnlhfpisees.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNudHhrY2tqYWZubGhmcGlzZWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5NTEwNzUsImV4cCI6MjA1NDUyNzA3NX0.ykG_VkaHvUFNdz3SDs3nsVl93elohPwj_t6ixF1N6MI';
const supabase = createClient(supabaseUrl, supabaseKey);

var range_manager = (function() {

    // load class
    /** 
     * A simple get/save range
     * **/

	const RMDb = {
		async save(name, range) {
			const { data, error } = await supabase
				.from('ranges')
				.upsert([{ name, range }], { onConflict: 'name' });
	
			if (error) {
				console.error('Error saving range:', error);
			} else {
				console.log('Range saved successfully:', data);
			}
		},
	
		async get(range_name) {
			const { data, error } = await supabase
				.from('ranges')
				.select('range')
				.eq('name', range_name);
	
			if (error) {
				console.error('Error fetching range:', error);
				return null;
			}
	
			// If no rows are returned, return null
			if (data.length === 0) {
				console.log('No range found for:', range_name);
				return null;
			}
	
			// Return the first row's range data
			return data[0].range;
		}
	};
    /**
     *  The current range
     *
     *  saved_range store the original range
     *  work on a clone of the original range
     */
    class Range {

        constructor(name) {
            this.name = name; // The id in base
            this.saved_range = RMDb.get(name);
            this.grid = new RMGrid();
            this.action = new RMAction();
            this.ranges;
            this.cards = [];
            this.alter = null;
            this.info;

            this._set_range();
        }

        async _set_range() {
			// Fetch the saved range from Supabase
			this.saved_range = await RMDb.get(this.name);
	
			// If no saved range is found, initialize with an empty object
			if (!this.saved_range) {
				this.saved_range = {};
			}
	
			this.ranges = JSON.parse(JSON.stringify(this.saved_range));
			this.card_list();
			this.info = new RangeInfo(this.ranges);
			this.info.set_combo_info();
			this.grid.set_range(this.ranges);
		}

        update_range() {
            this.alter = {};
            this.ranges = this.grid.get_range();
            this.info = new RangeInfo(this.ranges);
            this.info.set_combo_info();

            for (var action in this.ranges) {
                function difference(array1, array2) {
                    return array1.filter(x => !array2.includes(x));
                }
                this.alter[action] = difference(this.ranges[action], this.saved_range[action]);
            }
        }

        get_range() {
            return this.ranges;
        }

        // return uniq list of card
        card_list() {
            for (let k in this.ranges) {
                this.ranges[k].forEach(e => this.cards.push(e))
            }

            function uniq(array) {
                return [...new Set(array)];
            }
            this.cards = uniq(this.cards);
        }

    }
    /**
     * Range Manager Selecteur
     *  **/

    // WebComponent
    // It's the Select range - 

    // FIXME the value of id are not const !
    const TableSizePosition = {
        tables_size: [6, 8, 9],
        tables: {
            2: {
                blind: ['Small Blind Strategy', 'BB vs SB Limp', 'BB vs SB Raise']
            },
            3: {
                late: ["BT"]
            },
            4: {
                early: ["CO"],
                late: ["BT"]
            },
            5: {
                early: ["HJ"],
                middle: ["CO"],
                late: ["BT"]
            },
            6: {
                early: ["LJ"],
                middle: ["HJ"],
                late: ["CO", "BT"]
            },
            7: {
                early: ["UTG2"],
                middle: ["LJ", "HJ"],
                late: ["CO", "BT"]
            },
            8: {
                early: ["UTG1", "UTG2"],
                middle: ["LJ", "HJ"],
                late: ["CO", "BT"]
            },
            9: {
                early: ["UTG", "UTG1", "UTG2"],
                middle: ["LJ", "HJ"],
                late: ["CO", "BT"]
            }
        },
        get_table: function(size) {
            return JSON.parse(JSON.stringify(this.tables[size]));
        },
    }

    const StackSize = ["12-20bb", "25-40bb", "40-100bb"];

    const range_selector_template = document.createElement('template');
    range_selector_template.innerHTML = `
<div id="range_selector" class="select-block">
	<select id="tables" class="minimal"></select>
	<select id="stack_size" class="minimal"></select>
	<select id="actions" class="minimal"></select>
	<select id="positions" class="minimal"></select>
	<span id="g_versus" class="minimal">
		<label>Versus</label>
		<select id="versus_positions" class="minimal"></select>
	</span>
</div>
<style>
.hidden { display: none; }
select {
    /* styling */
    background-color: white;
    border: thin solid rgb(70, 70, 90);
    border-radius: 4px;
    display: inline-block;
    font-family: 'Montserrat', sans-serif;
    font-size: 1rem;
    color:rgb(0, 0, 0);
    line-height: 1.5em;
    padding: 0.4em 3.2em 0.4em .9em;
    /* reset */
    margin: 0;      
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    box-sizing: border-box;
    -webkit-appearance: none;
    -moz-appearance: none;
}
.select_label {
    font-size: .9em;
    font-weight: 600;
}
select.minimal {
    background-image:
        linear-gradient(45deg, transparent 50%, gray 50%),
        linear-gradient(135deg, gray 50%, transparent 50%),
        linear-gradient(to right, #ccc, #ccc);
    background-position:
        calc(100% - 20px) calc(1em + 2px),
        calc(100% - 15px) calc(1em + 2px),
        calc(100% - 2.5em) 0.5em;
    background-size:
        5px 5px,
        5px 5px,
        1px 1.5em;
    background-repeat: no-repeat;
}
select.minimal:focus {
    background-image:
        linear-gradient(45deg, rgb(70, 70, 90) 50%, transparent 50%),
        linear-gradient(135deg, transparent 50%, rgb(70, 70, 90) 50%),
        linear-gradient(to right, #ccc, #ccc);
    background-position:
        calc(100% - 15px) 1em,
        calc(100% - 20px) 1em,
        calc(100% - 2.5em) 0.5em;
    background-size:
        5px 5px,
        5px 5px,
        1px 1.5em;
    background-repeat: no-repeat;
    border-color: rgb(70, 70, 90);
    outline: 0;
}
</style>
`;

    class SelectRange extends HTMLElement {
        constructor() {
            super();
            this._rselector = this.attachShadow({
                mode: 'open'
            });
            this._rselector.appendChild(range_selector_template.content.cloneNode(true));

            this.tables = this._rselector.getElementById('tables');
            this.stack_size = this._rselector.getElementById('stack_size');
            this.actions = this._rselector.getElementById('actions');
            this.positions = this._rselector.getElementById('positions');
            this.versus_positions = this._rselector.getElementById('versus_positions');
            this.versus_screen = this._rselector.getElementById('g_versus');

            this.hero_pos_list = {};
            this.vilain_pos_list = {};


            this.set_table();
            this.set_stack_size();
            this.set_action();
            this.set_position();
            this.setOnChange();
        }

        setOnChange() {
            this.tables.addEventListener('change', () => {
                this.tables_change();
            }, false);
            this.actions.addEventListener('change', () => {
                this.set_position();
            }, false);
            this.positions.addEventListener('change', () => {
                this._set_versus_pos();
            }, false);
        }

        tables_change() {
            this.set_action();
            this.set_position();
        }

        set_table() {
            for (var i of TableSizePosition.tables_size) {
                this.tables.innerHTML += `<option value="${i}">${i}-max</option>`;
            }
        }

        // wooot that's coming to suck
        // TODO change the format of name range
        set_stack_size() {
            this.stack_size.innerHTML = '';
            StackSize.forEach(el => {
                var value = el.split('-').join('#').split('')
                value = value.splice(0, (el.length - 2)).join('');
                this.stack_size.innerHTML += `<option value="${value}">${el}</option>`
            });
        }

        set_action() {
            let actions = '';
            switch (this.tables.value) {
                case '2':
                    actions = {
                        bvb: "Blind vs Blind"
                    };
                    break;
                case '3':
                    actions = {
                        rfi: "RFI",
                        facingoop: "Facing RFI OOP",
                        bvb: "Blind vs Blind"
                    };
                    break;
                default:
                    actions = {
                        rfi: "RFI",
                        facingip: "Facing RFI IP",
                        facingoop: "Facing RFI OOP",
                        bvb: "Blind vs Blind"
                    };
                    break;
            }
            this.actions.innerHTML = '';
            for (const [k, v] of Object.entries(actions)) {
                this.actions.innerHTML += `<option value="${k}">${v}</option>`;
            }
        }

        set_position() {
            this._set_hero_pos();
            this._set_versus_pos();
        }


        _set_hero_pos() {
            this.set_hero_pos_list();
            this.set_selecteur_options(this.positions, this.hero_pos_list);
        }

        _set_versus_pos() {
            this.set_versus_pos_list();
            this.set_selecteur_options(this.versus_positions, this.vilain_pos_list);
        }

        set_selecteur_options(select, positions) {

            select.innerHTML = '';

            for (const name in positions) {
                let optgroup = document.createElement("optgroup");
                optgroup.label = name + " position";
                if (positions[name].length > 0) {
                    for (let v in positions[name]) {
                        let option = document.createElement("option");
                        let value = positions[name][v];
                        option.value = value;
                        option.innerHTML = value;
                        optgroup.appendChild(option);
                    }
                    select.appendChild(optgroup);
                }
            }
        }

        set_versus_pos_list() {

            const l = TableSizePosition.get_table(this.tables.value);

            this.vilain_pos_list = {};

            switch (this.actions.value) {
                case 'facingip':
                    for (const zone in l) {
                        var n = false;
                        for (let position_name of l[zone]) {
                            if (position_name === this.positions.value) {
                                n = true;
                                break;
                            } else {
                                if (!(zone in this.vilain_pos_list)) this.vilain_pos_list[zone] = [];
                                this.vilain_pos_list[zone].push(position_name);
                            }
                        }
                        if (n) break;
                    }
                    break;
                case 'facingoop':
                    this.vilain_pos_list = l;
                    break;
            }

        }

        // set the hero pos list and set visibilty on versus if needed
        set_hero_pos_list() {
            this.hero_pos_list = TableSizePosition.get_table(this.tables.value);
            switch (this.actions.value) {
                case 'facingip':
                    // hero can't be the first
                    var first_optgroup = Object.keys(this.hero_pos_list)[0];
                    this.hero_pos_list[first_optgroup] = this.hero_pos_list[first_optgroup].slice(1);
                    if (this.versus_screen.classList.contains('hidden')) {
                        this.versus_screen.classList.remove('hidden');
                    }
                    break;
                case 'facingoop':
                    this.hero_pos_list = {
                        blind: ['SB', 'BB']
                    };
                    if (this.versus_screen.classList.contains('hidden')) {
                        this.versus_screen.classList.remove('hidden');
                    }
                    break;
                case 'bvb':
                    this.hero_pos_list = {
                        blind: ['Small Blind Strategy', 'BB vs SB Limp', 'BB vs SB Raise']
                    }
                    if (!this.versus_screen.classList.contains('hidden')) {
                        this.versus_screen.classList.add('hidden');
                    }
                    break;
                case 'rfi':
                    if (!this.versus_screen.classList.contains('hidden')) {
                        this.versus_screen.classList.add('hidden');
                    }
                    break;
            }
        }

    }

    window.customElements.define('select-range', SelectRange);

    class RMSelector {

        constructor() {
            this.range_selector = document.getElementById('rs');
            this.table_size = this.range_selector.shadowRoot.getElementById('tables');
            this.stack_size = this.range_selector.shadowRoot.getElementById('stack_size');
            this.action = this.range_selector.shadowRoot.getElementById('actions');
            this.hero_pos = this.range_selector.shadowRoot.getElementById('positions');
            this.vilain_pos = this.range_selector.shadowRoot.getElementById('versus_positions');


        }


        get_range_name() {
            let name = `${this.table_size.value}${this.hero_pos.value}${this.stack_size.value}${this.action.value}`;
            switch (this.action.value) {
                case 'facingip':
                case 'facingoop':
                    name += this.vilain_pos.value;
                    break;
            }
            console.log(`nom de la range ${name}`);
            return name;
        }

    }
    /** Grid Manager
     *
     * **/

    class RMGrid {

        constructor(range) {
            this.grid = document.getElementById('range_manager');
            this.set_range(range);
        }

        // Set the html grid with the range
        // range: id list  of cards in the range
        set_range(range) {
            this.reset_grid();
            if (range != null) {
                for (var action in range) {
                    for (var i = 0; i < range[action].length; i++) {
                        document.getElementById(range[action][i]).classList.add(action);
                    }
                }
            }
        }

        get_range() {
            let cells = this.grid.getElementsByTagName('td');
            let ranges = {};

            for (let n = 0, size = cells.length; n < size; n++) {

                let action_card = cells[n].className.split(' ');

                action_card.forEach(function(action_name) {
                    switch (action_name) {
                        case 'pair':
                        case 'offsuit':
                        case 'suited':
                            break;
                        default:
                            if (!(action_name in ranges)) {
                                ranges[action_name] = [];
                            }
                            ranges[action_name].push(cells[n].id)
                            break;
                    }
                });
            }

            return ranges;
        }


        /* clean the html grid */
        reset_grid() {
            let grid = this.grid.rows;
            for (let i = 0; i < 13; i++) {
                var cols = grid[i].cells;
                for (let c = 0; c < 13; c++) {
                    cols[c].className.split(' ').forEach(function(item) {
                        switch (item) {
                            case 'pair':
                            case 'offsuit':
                            case 'suited':
                                break;
                            default:
                                cols[c].classList.remove(item);
                                break;
                        }
                    });
                }
            }

        }

        // Return list of id hands selected
        // TODO change the html id of table hand to grid_mananger
        get_used_hand() {
            let rows = this.grid.getElementsByTagName('td');
            let hands = [];
            for (let i = 0, n = rows.length; i < n; i++) {
                if (rows[i].className.split(' ').length > 1) {
                    hands.push(rows[i].id);
                }
            }
            return hands;
        }

        get_card_by_action(action) {
            let cards = this.grid.getElementsByClassName(action);
            let c = [];
            for (let i = 0; i < cards.length; i++) {
                c.push(cards[i].id);
            }
            return c;
        }
    }
    const hand_combinations = 1326;

    // multiplacateur
    const pair_combinations = 6;
    const suited_combinations = 4;
    const offsuit_combinations = 12;

    const suited_pourcent = suited_combinations / hand_combinations * 100;
    const offsuit_pourcent = offsuit_combinations / hand_combinations * 100;
    const pair_pourcent = pair_combinations / hand_combinations * 100;

    /**
     *
     *  RangeInfo use the html hand grid for making stats
     *  TODO change this with class object of the current range
     *  **/

    class RangeInfo {

        constructor(range) {
            // this.screen		= document.getElementById('range_info');
            // this.range		= range;
            // this.pair			= 0;
            // this.suited		= 0;
            // this.offsuit	= 0;
            // this.action2card	= {};
        }

        calcul_combo() {
            this.pair = 0;
            this.suited = 0;
            this.offsuit = 0;
            this.screen = document.getElementById('range_info');
            let temp_cards = []; // pour eviter les doublons 
            for (let action in this.range) {
                this.action2card[action] = {
                    pourcent: 0,
                    combos: 0
                };
                let cards = this.range[action];
                for (let i in cards) {
                    let card = cards[i];

                    if (card[2] === "s") {
                        this.action2card[action].combos += suited_combinations;
                        this.action2card[action].pourcent += suited_pourcent;
                    } else if (card[2] === "o") {
                        this.action2card[action].combos += offsuit_combinations;
                        this.action2card[action].pourcent += offsuit_pourcent;
                    } else {
                        this.action2card[action].combos += pair_combinations;
                        this.action2card[action].pourcent += pair_pourcent;
                    }

                    if (!temp_cards.includes(card)) {
                        temp_cards.push(card);
                        if (card[2] === "s") {
                            this.suited += 1;
                        } else if (card[2] === "o") {
                            this.offsuit += 1;
                        } else {
                            this.pair += 1;
                        }
                    }
                }
            }
        }

        set_combo_info() {
            
        }


        template_info_range(first, second, three, classename) {
            return `<ul class="${classename}"><li>${first}</li><li>${second}</li><li>${three}</li></ul>`;
        }
    }
    /**
     * @class
     * @classdesc Set the background color referer to the action to the grid
     */
    class RMAction {
        /**
         * Get the grid.<HTMLElement> grid_manager
         */
        constructor() {
            this.grid = document.getElementById('range_manager');
            this.cells = this.grid.getElementsByTagName('td');
            this.rfi = document.getElementById('rfi');
            this.facingrfi = document.getElementById('facingrfi');
            this.bvb = document.getElementById('bt_bvb');
        }

        cells() {
            return this.cells;
        }

        set_action_to_card(card_id) {
            let bts = document.getElementsByName('sel');
            for (let i = 0; i < bts.length; i++) {
                if (bts[i].checked) {
                    let action = bts[i].value;
                    this.card_toggle_class(card_id, action)
                }
            }
        }
        /**
         * Set the visibility to the good pannel action
         * @param { String } action
         */
        action_visibility(action) {

            switch (action) {
                case 'rfi':
                    if (this.rfi.classList.contains('disable')) this.rfi.classList.remove('disable');
                    if (!this.facingrfi.classList.contains('disable')) this.facingrfi.classList.add('disable');
                    if (!this.bvb.classList.contains('disable')) this.bvb.classList.add('disable');
                    document.getElementById('action_bet').checked = true;
                    break;
                case 'facingip':
                case 'facingoop':
                    if (!this.rfi.classList.contains('disable')) this.rfi.classList.add('disable');
                    if (this.facingrfi.classList.contains('disable')) this.facingrfi.classList.remove('disable');
                    if (!this.bvb.classList.contains('disable')) this.bvb.classList.add('disable');
                    document.getElementById('facing_flat').checked = true;
                    break;
            }
            if (action === 'bvb') {
                var value = document.getElementById('rs').shadowRoot.getElementById('positions').value;
                switch (value) {
                    case 'Small Blind Strategy':
                        if (!this.rfi.classList.contains('disable')) this.rfi.classList.add('disable');
                        if (!this.facingrfi.classList.contains('disable')) this.facingrfi.classList.add('disable');
                        if (this.bvb.classList.contains('disable')) this.bvb.classList.remove('disable');
                        document.getElementById('action_limpfold').checked = true;
                        break;
                    case 'BB vs SB Limp':
                        document.getElementById('action_bet').checked = true;
                        if (this.rfi.classList.contains('disable')) this.rfi.classList.remove('disable');
                        if (!this.facingrfi.classList.contains('disable')) this.facingrfi.classList.add('disable');
                        if (!this.bvb.classList.contains('disable')) this.bvb.classList.add('disable');
                        document.getElementById('action_bet').checked = true;
                        break;
                    case 'BB vs SB Raise':
                        if (!this.rfi.classList.contains('disable')) this.rfi.classList.add('disable');
                        if (this.facingrfi.classList.contains('disable')) this.facingrfi.classList.remove('disable');
                        if (!this.bvb.classList.contains('disable')) this.bvb.classList.add('disable');
                        document.getElementById('facing_flat').checked = true;
                        break;
                }

            }
        }

        card_toggle_class(idcard, action) {
            let card = document.getElementById(idcard)
            if (card.classList.contains(action)) {
                this.remove_card_value(card, action);
            } else {
                this.add_card_value(card, action);
            }
        }

        remove_card_value(card, value) {
            card.classList.remove(value);
        }

        // Reset card
        grid_set_hh_to_unset(hhid) {
            let hh = document.getElementById(hhid);
            hh.className = hh.className.split(' ')[0]; // Keep the first classname (pair, suited, offsuit)
        }

        add_card_value(card, value) {

            switch (value) {
                case "flat3bet":
                case "fourbet":
                case "flat5bet":
                    if (!card.classList.contains('bet')) {
                        card.classList.add('bet');
                    }
                    card.classList.remove("flat3bet", "fourbet", "flat5bet", "allin");
                    break;
                case "allin":
                    card.classList.remove("bet", "flat3bet", "fourbet", "flat5bet", "threebet", "flat4bet", "flat", "fivebet");
                    break;
                case "bet":
                    card.classList.remove("allin");
                    break;
                case "flat":
                    card.classList.remove("threebet", "allin");
                    break;
                case "threebet":
                    card.classList.remove("flat");
                    break;
                case "flat4bet":
                case "fivebet":
                    card.classList.remove("flat");
                    card.classList.add("threebet");
                    break;
                case 'limpfold':
                case 'limpcall':
                case 'limpraise':
                case 'raisefold':
                case 'raisecall':
                    card.classList.remove("limpfold", "limpcall", "limpraise", "raisefold", "raisecall");
                    break;

            }

            card.classList.add(value)
        }

    }
    // Tools for manage unod copy call and save
    //
    class GridAlter {

        constructor(range_name) {
            this.alter = false;
            this.copy = false;
            this.current_range_name = range_name;
            this.range_name = '';
            this.range = {};

            this.set_display();
        }

        range_change() {
            this.alter = true;
            this.set_display();
        }

        reset(current_range_name) {
            this.alter = false;
            this.current_range_name = current_range_name;
            this.set_display();
        }

        paste() {
            this.copy = false;
            this.alter = true;
            this.range_name = '';
            this.set_display();
        }
        copy_range(range_name, range) {
            this.copy = true;
            this.range = range;
            this.range_name = range_name;
        }

        set_display() {
            if (this.alter) {
                document.getElementById('grid_save').classList.remove('disable');
                document.getElementById('grid_undo').classList.remove('disable');

            } else {
                document.getElementById('grid_save').classList.add('disable');
                document.getElementById('grid_undo').classList.add('disable');
            }

            if (this.copy && this.current_range_name === this.range_name) {
                document.getElementById('grid_copy').classList.add('disable');
                document.getElementById('grid_paste').classList.add('disable');
            } else if (this.copy && this.current_range_name !== this.range_name) {
                document.getElementById('grid_copy').classList.remove('disable');
                document.getElementById('grid_paste').classList.remove('disable');
            } else {
                document.getElementById('grid_paste').classList.add('disable');
            }

        }
    }
    

    /**
     * @class
     * @classdesc 
     * update the pourcent of selected hands on the grid
     * the default action set to card is always the first possible action
     */
    class RMSlider {

        constructor() {

        }

        change(handsingrid, action) {

        }
    }



    /** 
     * author: E.p TrouDuCuLHideOut2.0 
     * **/
    class PRM {

        constructor() {
            this.selector = new RMSelector();
            this.range = new Range(this.selector.get_range_name());
            this.options = new GridAlter();
            this.slider = new RMSlider();

            this.set_eventListener();
        }


        set_eventListener() {
            this.range.action.action_visibility(this.selector.action.value);

            // Set event action to the select range 
            this.selector.table_size.addEventListener('change', () => {
                this.range = new Range(this.selector.get_range_name());
                this.options.reset(this.selector.get_range_name());
                this.range.action.action_visibility(this.selector.action.value);
            }, false);

            this.selector.hero_pos.addEventListener('change', () => {
                this.range = new Range(this.selector.get_range_name());
                this.options.reset(this.selector.get_range_name());
                this.range.action.action_visibility(this.selector.action.value);
            }, false);

            this.selector.action.addEventListener('change', () => {
                this.range = new Range(this.selector.get_range_name());
                this.options.reset(this.selector.get_range_name());
                this.range.action.action_visibility(this.selector.action.value);
            }, false);

            this.selector.stack_size.addEventListener('change', () => {
                this.range = new Range(this.selector.get_range_name());
                this.options.reset(this.selector.get_range_name());
            }, false);

            this.selector.vilain_pos.addEventListener('change', () => {
                this.range = new Range(this.selector.get_range_name());
                this.options.reset(this.selector.get_range_name());
            }, false);

            // Card on grid event
            for (var i = 0, n = this.range.action.cells.length; i < n; i++) {
                var cell = this.range.action.cells[i];
                cell.addEventListener('click', (e) => {
                    this.range.action.set_action_to_card(e.target.id);
                    this.options.range_change();
                    this.range.update_range();
                }, false);
            }

            // Set action on save
            document.getElementById('grid_save').addEventListener('click', async () => {
                const rangeName = this.selector.get_range_name();
                const rangeData = this.range.grid.get_range();
                await RMDb.save(rangeName, rangeData);
                this.options.reset(rangeName);
                this.range.saved_range = rangeData;
            }, false);

            document.getElementById('grid_copy').addEventListener('click', () => {
                this.options.copy_range(this.selector.get_range_name(), this.range.grid.get_range());
            }, false);

            document.getElementById('grid_undo').addEventListener('click', () => {
                this.range.grid.set_range(this.range.saved_range);
                this.range.update_range();
                this.options.reset(this.selector.get_range_name());
            }, false);

            document.getElementById('grid_paste').addEventListener('click', () => {
                this.range.grid.set_range(this.options.range);
                this.options.paste();
            }, false);
        }
    }

	return new PRM();

})();