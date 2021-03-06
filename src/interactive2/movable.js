/**
 * Movable
 *
 * A Movable Something, that sends onMove events based on the
 * mouse coordinate (graphie unscaled, non-pixel-value) of the
 * move.
 *
 * Other MovableThings should generally have a Movable field, and
 * let this class handle all of the virtual mouse events, and then
 * take appropriate action in onMoveStart, onMove, onMoveEnd
 */

var InteractiveUtil = require("./interactive-util.js");
var normalizeOptions = InteractiveUtil.normalizeOptions;

var knumber = KhanUtil.knumber;
var kpoint = KhanUtil.kpoint;

// state parameters that should be converted into an array of
// functions
var FUNCTION_ARRAY_OPTIONS = [
    "add",
    "modify",
    "draw",
    "remove",
    "onMoveStart",
    "onMove",
    "onMoveEnd",
    "onClick"
];

// Default "props" and "state". Both are added to this.state and
// receive magic getter methods (this.isHovering() etc).
// However, properties in DEFAULT_PROPS are updated on `modify()`,
// while those in DEFAULT_STATE persist and are not updated.
// Things that the user might want to change should be on "props",
// while things used to render the movable should be on "state".
var DEFAULT_PROPS = {
    cursor: null
};
var DEFAULT_STATE = {
    added: false,
    isHovering: false,
    isMouseOver: false,
    isDragging: false,
    mouseTarget: null
};

var Movable = function(graphie, options) {
    _.extend(this, {
        graphie: graphie,
        state: {
            // Set here because this must be unique for each instance
            id: _.uniqueId("movable")
        }
    });

    // We only set DEFAULT_STATE once, here
    this.modify(_.extend({}, DEFAULT_STATE, options));
};

InteractiveUtil.createGettersFor(Movable, _.extend({},
    DEFAULT_PROPS,
    DEFAULT_STATE
));
InteractiveUtil.addMovableHelperMethodsTo(Movable);

_.extend(Movable.prototype, {

    cloneState: function() {
        return _.clone(this.state);
    },

    _createDefaultState: function() {
        return _.extend({
            id: this.state.id,
            add: [],
            modify: [],
            draw: [],
            remove: [],
            onMoveStart: [],
            onMove: [],
            onMoveEnd: [],
            onClick: []

        // We only update props here, because we want things on state to
        // be persistent, and updated appropriately in modify()
        }, DEFAULT_PROPS);
    },

    /**
     * Resets the object to its state as if it were constructed with
     * `options` originally. The only state maintained is `state.id`
     *
     * Analogous to React.js's replaceProps
     */
    modify: function(options) {
        this.update(_.extend({}, this._createDefaultState(), options));
    },

    /**
     * Adjusts constructor parameters without changing previous settings
     * for any option not specified
     *
     * Analogous to React.js's setProps
     */
    update: function(options) {
        var self = this;
        var graphie = self.graphie;

        var prevState = self.cloneState();
        var state = _.extend(
            self.state,
            normalizeOptions(FUNCTION_ARRAY_OPTIONS, options)
        );

        // the invisible shape in front of the point that gets mouse events
        if (state.mouseTarget && !prevState.mouseTarget) {
            var $mouseTarget = $(state.mouseTarget[0]);

            $mouseTarget.on("vmouseover", function() {
                state.isMouseOver = true;
                if (!graphie.isDragging) {
                    state.isHovering = true;
                }
                self.draw();
            });

            $mouseTarget.on("vmouseout", function() {
                state.isMouseOver = false;
                if (!state.isDragging) {
                    state.isHovering = false;
                }
                self.draw();
            });

            $mouseTarget.on("vmousedown", function(e) {
                if (e.which !== 0 && e.which !== 1) {
                    return;
                }
                e.preventDefault();

                var startMouseCoord = graphie.getMouseCoord(e);
                var prevMouseCoord = startMouseCoord;
                self._fireEvent(
                    state.onMoveStart,
                    startMouseCoord,
                    startMouseCoord
                );

                $(document).bind("vmousemove", function(e) {
                    e.preventDefault();

                    state.isDragging = true;
                    graphie.isDragging = true;

                    var mouseCoord = graphie.getMouseCoord(e);
                    self._fireEvent(
                        state.onMove,
                        mouseCoord,
                        prevMouseCoord
                    );
                    self.draw();
                    prevMouseCoord = mouseCoord;
                });

                $(document).bind("vmouseup", function(e) {
                    $(document).unbind("vmousemove vmouseup");
                    if (state.isHovering) {
                        self._fireEvent(
                            state.onClick,
                            prevMouseCoord,
                            startMouseCoord
                        );
                    }
                    state.isHovering = self.state.isMouseOver;
                    state.isDragging = false;
                    graphie.isDragging = false;
                    self._fireEvent(
                        state.onMoveEnd,
                        prevMouseCoord,
                        startMouseCoord
                    );
                    self.draw();
                });
            });
        }

        if (state.mouseTarget && state.cursor !== undefined) {
            // "" removes the css cursor if state.cursor is null
            $(state.mouseTarget[0]).css("cursor", state.cursor || "");
        }


        self.prevState = self.cloneState();
        // Trigger an add event if this hasn't been added before
        if (!state.added) {
            self._fireEvent(state.modify, self.prevState);
            state.added = true;

            // Update the state for `added` and in case the add event
            // changed it
            self.prevState = self.cloneState();
        }

        // Trigger a modify event
        self._fireEvent(state.modify, self.prevState);
        // Update the state if the modify event changed it
        self.prevState = self.cloneState();
    },

    remove: function() {
        this.state.added = false;
        this._fireEvent(this.state.remove);
        if (this.state.mouseTarget) {
            $(this.state.mouseTarget).off();
            this.state.mouseTarget.remove();
            this.state.mouseTarget = null;
        }
    },

    // Change z-order to back
    toBack: function() {
        if (this.state.mouseTarget) {
            this.state.mouseTarget.toBack();
        }
    },

    // Change z-order to front
    toFront: function() {
        if (this.state.mouseTarget) {
            this.state.mouseTarget.toFront();
        }
    }
});

module.exports = Movable;
