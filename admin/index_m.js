// This will be called by the admin adapter when the settings page loads
const ORDER = {
    ASC: 'asc',
    DESC: 'desc'
}

const SORT = {
    linkedId: 'linkedId',
    parentId: 'parentId',
    parentName: 'parentName',
    isLinked: 'isLinked'
}

var sortLinkedId = ORDER.ASC;
var sortParentId = ORDER.DESC;
var sortParentName = ORDER.DESC;

var currentSort = SORT.linkedId;
var currentOrder = ORDER.DESC;

var myNamespace;

var tableSizeAtStart = 0;

var Input = {};
var Label = {};
var Button = {};
var Checkbox = {};

async function load(settings, onChange) {
    // Namespace bauen
    myNamespace = adapter + '.' + instance;

    // example: select elements with id=key and class=value and insert value
    if (!settings) return;
    $('.value').each(function () {
        var $key = $(this);
        var id = $key.attr('id');
        if ($key.attr('type') === 'checkbox') {
            // do not call onChange direct, because onChange could expect some arguments
            $key.prop('checked', settings[id])
                .on('change', () => onChange())
                ;
        } else {
            // do not call onChange direct, because onChange could expect some arguments
            $key.val(settings[id])
                .on('change', () => onChange())
                .on('keyup', () => onChange())
                ;
        }
    });

    getIsAdapterAlive(function (isAlive) {
        // var $btnRefresh = $('.btn-refresh');

        // $btnRefresh.on('click', function () {
        // 	readLinkedObjects();
        // });
    });

    // Divs in vars packen
    initialize_Divs();

    // Table erzeugen
    $(`th[data-name=${currentSort}]`).text(`${$(`th[data-name=${currentSort}]`).text()} ▴`);
    createTable(onChange);

    // GUI Events
    await events(onChange);

    onChange(false);

    // reinitialize all the Materialize labels on the page if you are dynamically adding inputs:
    if (M) M.updateTextFields();
}

// This will be called by the admin adapter when the user presses the save button
async function save(callback) {
    // example: select elements with class=value and build settings object
    var obj = {};
    $('.value').each(function () {
        var $this = $(this);
        if ($this.attr('type') === 'checkbox') {
            obj[$this.attr('id')] = $this.prop('checked');
        } else {
            obj[$this.attr('id')] = $this.val();
        }
    });

    // Daten aus Tabelle holen, denen ein neues ParentIbjekt zugewisen wurde
    var tableData = table2values('events').filter(function (res) {
        return res.isLinked === false && res.parentId
    });

    if (Object.keys(tableData).length > 0) {
        tableData.forEach(function (tableItem) {

            saveAssignedParentObjects(tableItem);
        });
    }
    callback(obj);
}

async function initialize_Divs() {

    // Inputs
    Input.scriptName = $('input[id="scriptName"]');
    Input.variableName = $('input[id="variableName"]');

    // Labels    
    Label.ButtonCreateJavaScript = $('label[id="labelBtnJavascript"');
    Label.labelTableEntries = $('label[id="labelTableEntries"');

    // Buttons
    Button.createJavaScript = $('.values-buttons[data-command="btnCreateJavascript"]');
    Button.createJavaScript.attr('title', _('generate script'));

    //CheckBoxes
    Checkbox.generateVarsForAllObjectsOfInstance = $('input[id="generateVarsForAllObjectsOfInstance"]');
    Checkbox.generateSetStateForReadOnly = $('input[id="generateSetStateForReadOnly"]');


    var javascriptAdapter = await getObject("system.adapter.javascript.0");
    if (!javascriptAdapter) {
        // Javascript Adapter ist nicht installiert -> Button deaktivieren und info anzeigen
        Button.createJavaScript.attr('disabled', true);
        Input.scriptName.attr('disabled', true);
        Input.variableName.attr('disabled', true);
        Checkbox.generateVarsForAllObjectsOfInstance.attr('disabled', true);
        Checkbox.generateSetStateForReadOnly.attr('disabled', true);

        //TODO: translation
        Label.ButtonCreateJavaScript.text(_('javascript adapter is not installed'));
    } else {
        if (!Input.scriptName.val()) {
            Input.scriptName.val(myNamespace);
            $("label[for='scriptName']").addClass("active");        //overlapping bug fix
        }
        if (!Input.variableName.val()) {
            Input.variableName.val(myNamespace.replace(".", ""));
            $("label[for='variableName']").addClass("active");      //overlapping bug fix
        }
    }
}

async function saveAssignedParentObjects(tableItem) {
    // notwendige custom daten an neu zugeordnete parentObjekte übergeben
    try {
        linkedObject = await getObject(tableItem.linkedId);
        parentObject = await getObject(tableItem.parentId);

        if (linkedObject && linkedObject.common && linkedObject.common.custom && linkedObject.common.custom[myNamespace]) {
            if (parentObject && parentObject.common) {

                // common Daten des linkedObjects holen, die beim parentObject in den Settings konfiguriert werden können
                let customForParentObj = {};

                let expertSettings = false;

                if (linkedObject.common.name) {
                    if (parentObject.common.name) {
                        if (parentObject.common.name != linkedObject.common.name) {
                            // nur übergeben wenn unterschiedlich zwischen linkedObject & parentObject ist
                            customForParentObj["name"] = linkedObject.common.name;
                        }
                    } else {
                        customForParentObj["name"] = linkedObject.common.name;
                    }
                }

                if (linkedObject.common.unit) {
                    if (parentObject.common.unit) {
                        if (parentObject.common.unit != linkedObject.common.unit) {
                            // nur übergeben wenn unterschiedlich zwischen linkedObject & parentObject ist
                            customForParentObj["number_unit"] = linkedObject.common.unit;
                            expertSettings = true;
                        }
                    } else {
                        customForParentObj["number_unit"] = linkedObject.common.unit;
                        expertSettings = true;
                    }
                }

                if (linkedObject.common.max) {
                    if (parentObject.common.max) {
                        if (parentObject.common.max != linkedObject.common.max) {
                            // nur übergeben wenn unterschiedlich zwischen linkedObject & parentObject ist
                            customForParentObj["number_max"] = linkedObject.common.max;
                            expertSettings = true;
                        }
                    } else {
                        customForParentObj["number_max"] = linkedObject.common.max;
                        expertSettings = true;
                    }
                }

                if (linkedObject.common.min) {
                    if (parentObject.common.min) {
                        if (parentObject.common.min != linkedObject.common.min) {
                            // nur übergeben wenn unterschiedlich zwischen linkedObject & parentObject ist
                            customForParentObj["number_min"] = linkedObject.common.min;
                            expertSettings = true;
                        }
                    } else {
                        customForParentObj["number_min"] = linkedObject.common.min;
                        expertSettings = true;
                    }
                }

                if (linkedObject.common.type) {
                    if (parentObject.common.type && parentObject.common.type != linkedObject.common.type) {
                        // nur übergeben wenn Einheit unterschiedlich zwischen linkedObject & parentObject ist
                        let convertToKey = parentObject.common.type + "_convertTo";

                        if (linkedObject.common.custom && linkedObject.common.custom[myNamespace] && linkedObject.common.custom[myNamespace].number_to_duration_format) {
                            // Spezial Format: Duration
                            customForParentObj[convertToKey] = "duration"
                            expertSettings = true;
                        } else if (linkedObject.common.custom && linkedObject.common.custom[myNamespace] && linkedObject.common.custom[myNamespace].number_to_datetime_format) {
                            // Spezial Format: DateTime
                            customForParentObj[convertToKey] = "datetime"
                            expertSettings = true;
                        } else {
                            // kein Spezial Format
                            customForParentObj[convertToKey] = linkedObject.common.type;
                            expertSettings = true;
                        }
                    }
                }

                // custom Data vom linked Object holen und um nicht benötigte keys für das parentObject bereinigen
                let customFromLinkedObject = linkedObject.common.custom[myNamespace];

                if (customFromLinkedObject.enabled) {
                    delete customFromLinkedObject.enabled;
                }

                if (customFromLinkedObject.parentId) {
                    delete customFromLinkedObject.parentId;
                }

                if (customFromLinkedObject.parentType) {
                    delete customFromLinkedObject.parentType;
                }

                if (customFromLinkedObject.isLinked || !customFromLinkedObject.isLinked) {
                    delete customFromLinkedObject.isLinked;
                }

                // bereinigt custom Data und common Data vom linkedObject zusammenführen
                if (Object.keys(customFromLinkedObject).length > 0) {
                    // Wenn custom Daten in linkedObject vorhanden -> dann expertSettings setzen
                    expertSettings = true;
                }
                Object.assign(customForParentObj, customFromLinkedObject);

                // weitere benötigte Daten hinzufügen
                customForParentObj.enabled = true;
                customForParentObj.linkedId = linkedObject._id.replace(myNamespace + ".", "");
                customForParentObj.expertSettings = expertSettings;

                // custom Data an parentObject übergeben
                if (parentObject.common.custom) {
                    // custom von anderen Adaptern vorhanden
                    parentObject.common.custom[myNamespace] = customForParentObj;
                } else {
                    // kein custom vorhanden
                    parentObject.common.custom = { [myNamespace]: customForParentObj };
                }

                // parentObject aktualisieren -> linkedObject Daten werden automatisch wegen neustart des Adapters nach dem speichern aktualisiert
                await setForeignObject(parentObject);
            }
        }
    } catch (err) {
        showError("saveAssignedParentObjects: " + err);
    }
}

async function createTable(onChange, filterText = null) {
    try {
        let tableData = await getTableData();	// Array für tableFkt

        if (tableSizeAtStart === 0) {
            tableSizeAtStart = tableData.length;
        }

        if (tableData) {
            $('h6[id=noTableData]').hide();

            if (filterText != null) {
                // Tabelle filtern
                tableData = tableData.filter(function (res) {
                    return res.linkedId.toUpperCase().includes(filterText.toUpperCase()) ||
                        res.parentId.toUpperCase().includes(filterText.toUpperCase()) ||
                        res.parentName.toUpperCase().includes(filterText.toUpperCase());
                });
            }

            Label.labelTableEntries.text(`Einträge: ${tableData.length} / ${tableSizeAtStart}`);

            sortData(tableData, currentSort, onChange);

        } else {
            $('h6[id=noTableData]').show();
        }
    } catch (err) {
        showError("createTable: " + err);
    }
}

async function getTableData() {
    try {
        // Alle linkedDevices Objekte der Instanz holen
        let linkedDevicesList = await getForeignObjects(myNamespace + '.*');
        let tableData = [];

        if (linkedDevicesList != null && Object.keys(linkedDevicesList).length > 0) {
            for (var id in linkedDevicesList) {
                // benötigte Daten in Array für tableFkt packen
                let linkedObj = linkedDevicesList[id];

                if (linkedObj && linkedObj.common && linkedObj.common.custom && linkedObj.common.custom[myNamespace]) {
                    let parentId = '';
                    var parentName = '';

                    if (linkedObj.common.custom[myNamespace].isLinked) {
                        // Verlinkung exitsiert -> parentId übergeben
                        parentId = linkedObj.common.custom[myNamespace].parentId

                        // Name des parent Objektes holen
                        let parentObj = await getObject(parentId);
                        if (parentObj && parentObj.common && parentObj.common.name) {
                            parentName = parentObj.common.name;
                        }
                    }

                    tableData.push({ "linkedId": id, "parentId": parentId, "isLinked": linkedObj.common.custom[myNamespace].isLinked, "parentName": parentName });
                }
            }
            return tableData;
        } else {
            return null;
        }
    } catch (err) {
        showError("getTableData: " + err);
    }
}

async function events(onChange) {
    try {
        // linkedId column header click event
        $('th[data-name="linkedId"]').on('click', function () {
            var tableData = table2values('events');
            sortData(tableData, SORT.linkedId, onChange);
        });

        // parentId column header click event
        $('th[data-name="parentId"]').on('click', function () {
            var tableData = table2values('events');
            sortData(tableData, SORT.parentId, onChange);
        });

        // parentName column header click event
        $('th[data-name="parentName"]').on('click', function () {
            var tableData = table2values('events');
            sortData(tableData, SORT.parentName, onChange);
        });

        $('th[data-name="isLinked"]').on('click', function () {
            var tableData = table2values('events');
            sortData(tableData, SORT.isLinked, onChange);
        });

        // filter list
        await $('input[id="filterList"').on('input', function () {
            let text = $(this).val();

            if (currentOrder === ORDER.ASC) {
                currentOrder = ORDER.DESC;
            } else {
                currentOrder = ORDER.ASC;
            }

            createTable(onChange, text);
        });

        await Button.createJavaScript.on('click', function () {
            createJavascriptConfirm();
        });

        Input.variableName.keyup(function () {
            // Nur Nummern und math operators * | / zulassen
            let allowedSigns = /[^a-zA-Z0-9]/;

            if (this.value.length > 0) {
                if (allowedSigns.test(this.value)) {
                    // prüfen auf zulässige Zeichen
                    showError(_("Characters not allowed<br>Only letters and numbers are allowed"));
                }
            }
            this.value = this.value.replace(allowedSigns, '');
        });


    } catch (err) {
        showError(err);
    }
}

function createJavascriptConfirm() {
    confirmMessage(_('After the script has been generated, the javascript adapter will be restarted!<br><br><br>Do you want to continue?'), _('attention'), null, [_('Cancel'), _('OK')], function (result) {
        if (result === 1) {
            createJavascript();
        }
    });
}

async function createJavascript() {
    try {
        var javascriptAdapter = await getObject("system.adapter.javascript.0");
        if (javascriptAdapter) {
            // sofern javascript instanz vorhanden ist

            var rootName = Input.variableName.val();
            let autoScript = `var ${rootName} = {};\n\n`

            // alle linkedObjects laden und aufsteigend sortieren
            let linkedDevicesList = await getForeignObjects(myNamespace + '.*');
            let sortedIdList = Object.keys(linkedDevicesList).sort(function (x, y) { return ((x.toLowerCase() < y.toLowerCase()) ? -1 : ((x.toLowerCase() > y.toLowerCase()) ? 1 : 0)) });


            if (linkedDevicesList != null && Object.keys(linkedDevicesList).length > 0) {
                let existingVarName = [];
                for (var id in sortedIdList) {
                    let linkedId = sortedIdList[id];
                    let linkedObject = linkedDevicesList[sortedIdList[id]];

                    // sofern isLinked = true -> mit in die skript Erstellung einbeziehen
                    if (linkedObject && linkedObject.common && linkedObject.common.custom && linkedObject.common.custom[myNamespace] && linkedObject.common.custom[myNamespace].isLinked
                        || linkedObject && Checkbox.generateVarsForAllObjectsOfInstance.is(":checked")) {

                        // struktur der variablen bauen
                        let linkedIdSplitted = linkedId.replace(myNamespace + ".", "").split(".");
                        let varName = ""
                        if (linkedIdSplitted.length > 0) {
                            for (var i = 0; i < linkedIdSplitted.length; i++) {

                                if (i === 0) {
                                    varName = `${rootName}.${linkedIdSplitted[i]}`;
                                } else {
                                    varName = varName.concat(`.${linkedIdSplitted[i]}`)
                                }

                                if (!existingVarName.includes(`${varName} = {};\n`)) {
                                    autoScript = autoScript.concat(`${varName} = {};\n`);
                                    existingVarName.push(`${varName} = {};\n`);

                                    if (i != linkedIdSplitted.length - 1) {
                                        autoScript = autoScript.concat(`${varName}.getId = function() {return ("${varName.replace(rootName, myNamespace)}")};\n`);
                                        existingVarName.push(`${varName}.getId = function() {return ("${varName.replace(rootName, myNamespace)}")};\n`);
                                    }
                                }
                            }

                            // Funktionen den linkedObjects hinzufügen
                            autoScript = autoScript.concat(`${varName}.getId = function() {return "${linkedId}"};\n`);
                            autoScript = autoScript.concat(`${varName}.getState = function() {return getState("${linkedId}")};\n`);

                            if (linkedObject.common.write && linkedObject.common.write === true || Checkbox.generateSetStateForReadOnly.is(":checked")) {
                                autoScript = autoScript.concat(`${varName}.setState = function(val, ack) {return setState("${linkedId}", val, ack)};\n`);
                                autoScript = autoScript.concat(`${varName}.setStateDelayed = function(val, ack, delay) {return setStateDelayed("${linkedId}", val, ack, delay)};\n`);
                            }

                            autoScript = autoScript.concat(`${varName}.getObject = function() {return getObject("${linkedId}")};\n`);
                        }
                        autoScript = autoScript.concat("\n");
                    }
                }

                // erste Ordner (Mappe) anlegen
                let folder = {
                    type: "channel",
                    _id: "script.js.global.linkeddevices",
                    common: {
                        name: "linkeddevices",
                        expert: true
                    }
                }
                await setObject("script.js.global.linkeddevices", folder);

                // Skript erstellen
                let scriptId = `script.js.global.linkeddevices.${myNamespace.replace(".", "")}`
                let script = {
                    type: "script",
                    _id: scriptId,
                    common: {
                        name: Input.scriptName.val(),
                        expert: true,
                        engineType: "Javascript/js",
                        engine: "system.adapter.javascript.0",
                        source: autoScript,
                        debug: false,
                        verbose: false,
                        enabled: true
                    }
                }
                await setObject(scriptId, script);
            }
        }

    } catch (err) {
        showError("generate javascript:" + err)
    }
}

async function tableOnReady() {
    $('#events .table-values-div .table-values .values-buttons[data-command="assignLink"]').on('click', function () {
        let rowNum = $(this).data('index');
        initSelectId(function (sid) {
            sid.selectId('show', null, function (parentId) {

                if (parentId) {
                    assignParentObject(rowNum, parentId);
                }
            });
        });
    });

    $('#events .table-values-div .table-values .values-buttons[data-command="openCustom"]').on('click', function () {
        let rowNum = $(this).data('index');
        let parentId = $('#events .values-input[data-name="parentId"][data-index="' + rowNum + '"]').val();
        let url = `${window.location.origin}/#tab-objects/customs/${parentId}`;

        window.open(url);
        //window.open(url, "_top");
    });
}

async function assignParentObject(rowNum, parentId) {
    try {
        let parentObj = await getObject(parentId);

        // Prüfen ob ausgewähltes Objekt bereits verlinkt ist bzw. ein linkedObject ist
        if (parentObj && parentObj.common && parentObj.common.custom && parentObj.common.custom[myNamespace]) {

            if (parentObj.common.custom[myNamespace].isLinked) {
                // ist linkedObject
                showError(_("link to an already linked object of the same instance is not possible!"));
            } else {
                // ist bereits verlinkt
                showError(_("the selected object is already linked with '%s'!", myNamespace + "." + parentObj.common.custom[myNamespace].linkedId));
            }
            return;
        }

        // linkedObject holen
        let linkedId = $('#events .values-input[data-name="linkedId"][data-index="' + rowNum + '"]').val();
        let linkedObject = await getObject(linkedId);

        // Falls type conversion vorhanden, prüfen ob zugewiesenes parentObject vom richtigen type ist
        if (linkedObject && linkedObject.common && linkedObject.common.custom && linkedObject.common.custom[myNamespace]) {

            if (linkedObject.common.custom[myNamespace].parentType != parentObj.common.type) {
                showError(_("the selected object is of type '%s'.<br>The linked object needs an object of type '%s'!", _(parentObj.common.type), _(linkedObject.common.custom[myNamespace].parentType)));
                return;
            }
        }

        //showMessage(JSON.stringify(linkedObject));


        // Daten in table schreiben
        $('#events .values-input[data-name="parentId"][data-index="' + rowNum + '"]').val(parentObj._id).trigger('change');
        if (parentObj && parentObj.common && parentObj.common.name) {
            $('#events .values-input[data-name="parentName"][data-index="' + rowNum + '"]').val(parentObj.common.name).trigger('change');
        }
    } catch (err) {
        showError("assignParentObject: " + err);
    }
}

var selectId;
function initSelectId(callback) {
    if (selectId) {
        return callback(selectId);
    }
    socket.emit('getObjects', function (err, objs) {
        selectId = $('#dialog-select-member').selectId('init', {
            noMultiselect: true,
            objects: objs,
            imgPath: '../../lib/css/fancytree/',
            filter: { type: 'state' },
            name: 'scenes-select-state',
            expertModeRegEx: /^system\.|^iobroker\.|^_|^[\w-]+$|^enum\.|^[\w-]+\.admin|^script\./,
            texts: {
                select: _('Select'),
                cancel: _('Cancel'),
                all: _('All'),
                id: _('ID'),
                name: _('Name'),
                role: _('Role'),
                room: _('Room'),
                value: _('Value'),
                selectid: _('Select ID'),
                from: _('From'),
                lc: _('Last changed'),
                ts: _('Time stamp'),
                wait: _('Processing...'),
                ack: _('Acknowledged'),
                selectAll: _('Select all'),
                unselectAll: _('Deselect all'),
                invertSelection: _('Invert selection')
            },
            columns: ['image', 'name']
        });
        callback(selectId);
    });
}

async function getForeignObjects(pattern) {
    return new Promise((resolve, reject) => {
        socket.emit('getForeignObjects', pattern, function (err, res) {
            if (!err && res) {
                resolve(res);
            } else {
                resolve(null);
            }
        });
    });
}

async function getObject(id) {
    return new Promise((resolve, reject) => {
        socket.emit('getObject', id, function (err, res) {
            if (!err && res) {
                resolve(res);
            } else {
                resolve(null);
            }
        });
    });
}

async function setObject(id, obj) {
    return new Promise((resolve, reject) => {
        socket.emit('setObject', id, obj, function (err, res) {
            if (!err && res) {
                resolve(res);
            } else {
                resolve(null);
            }
        });
    });
}


async function setForeignObject(obj) {
    new Promise((resolve, reject) => {
        socket.emit('setObject', obj._id, obj, function (err, res) {
            if (!err && res) {
                resolve(res);
            } else {
                resolve(null);
            }
        });
    });
}

function sortData(data, key, onChange) {

    if (currentSort === key) {
        // sort order ändert sich, order symbol im col header anpassen
        let col = $(`th[data-name=${currentSort}]`);
        let colText = $(`th[data-name=${currentSort}]`).text();

        if (currentOrder === ORDER.ASC) {
            myValues2table('events', sortByKey(data, currentSort, false), onChange, tableOnReady);
            currentOrder = ORDER.DESC

            if (colText.includes("▴")) {
                col.text(colText.replace("▴", "▾"));
            }
        } else {
            myValues2table('events', sortByKey(data, currentSort, true), onChange, tableOnReady);
            currentOrder = ORDER.ASC

            if (colText.includes("▾")) {
                col.text(colText.replace("▾", "▴"));
            }
        }
    } else {
        // sort col ändert sich
        currentOrder = ORDER.ASC;
        currentSort = key;
        $(`th[data-name=${"linkedId"}]`).text(`${$(`th[data-name=${"linkedId"}]`).text().replace(" ▴", "  ").replace(" ▾", "  ")}`);
        $(`th[data-name=${"parentId"}]`).text(`${$(`th[data-name=${"parentId"}]`).text().replace(" ▴", "  ").replace(" ▾", "  ")}`);
        $(`th[data-name=${"parentName"}]`).text(`${$(`th[data-name=${"parentName"}]`).text().replace(" ▴", "  ").replace(" ▾", "  ")}`);
        $(`th[data-name=${"isLinked"}]`).text(`${$(`th[data-name=${"isLinked"}]`).text().replace(" ▴", "  ").replace(" ▾", "  ")}`);

        myValues2table('events', sortByKey(data, currentSort, true), onChange, tableOnReady);

        $(`th[data-name=${currentSort}]`).text(`${$(`th[data-name=${currentSort}]`).text()} ▴`);
    }
}

function sortByKey(array, key, sortASC) {
    return array.sort(function (a, b) {
        var x = a[key];
        var y = b[key];

        if (sortASC) {
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        } else {
            return ((x > y) ? -1 : ((x < y) ? 1 : 0));
        }
    });
}

function myValues2table(divId, values, onChange, onReady, maxRaw) {
    if (typeof values === 'function') {
        typeof onChange === 'number' ? maxRaw = onChange : maxRaw = null;
        onChange = values;
        values = divId;
        divId = '';
    }

    if (typeof onReady === 'number') {
        maxRaw = onReady;
        onReady = null;
    } else if (typeof maxRaw === 'undefined') {
        maxRaw = null;
    }

    values = values || [];
    var names = [];
    var $div;
    if (!divId) {
        $div = $('body');
    } else {
        $div = $('#' + divId);
    }
    var $add = $div.find('.table-button-add');
    $add.data('raw', values.length);

    if (maxRaw) {
        $add.data('maxraw', maxRaw);
    }

    if (!$add.data('inited')) {
        $add.data('inited', true);

        var addText = $add.text();

        if (!isMaterialize) {
            $add.button({
                icons: { primary: 'ui-icon-plus' },
                text: !!addText,
                label: addText ? _(addText) : undefined
            });
        }

        $add.on('click', function () {
            if (!$add.data('maxraw') || ($add.data('raw') < $add.data('maxraw'))) {
                var $table = $div.find('.table-values');
                var values = $table.data('values');
                var names = $table.data('names');
                var obj = {};
                for (var i = 0; i < names.length; i++) {
                    if (!names[i]) continue;
                    obj[names[i].name] = names[i].def;
                }
                values.push(obj);
                onChange && onChange();
                setTimeout(function () {
                    myValues2table(divId, values, onChange, onReady);
                }, 100);
                $add.data('raw', $add.data('raw') + 1);
            } else {
                confirmMessage(_('maxTableRaw') + ': ' + $add.data('maxraw'), _('maxTableRawInfo'), 'alert', ['Ok']);
            }
        });
    }

    if (values) {
        var buttons = [];
        var $table = $div.find('.table-values');
        $table.data('values', values);

        $table.find('th').each(function () {
            var name = $(this).data('name');
            if (name) {
                var obj = {
                    name: name,
                    type: $(this).data('type') || 'text',
                    def: $(this).data('default'),
                    style: $(this).data('style'),
                    tdstyle: $(this).data('tdstyle')
                };
                if (obj.type === 'checkbox') {
                    if (obj.def === 'false') obj.def = false;
                    if (obj.def === 'true') obj.def = true;
                    obj.def = !!obj.def;
                } else if (obj.type === 'select' || obj.type === 'select multiple') {
                    var vals = ($(this).data('options') || '').split(';');
                    obj.options = {};
                    for (var v = 0; v < vals.length; v++) {
                        var parts = vals[v].split('/');
                        obj.options[parts[0]] = _(parts[1] || parts[0]);
                        if (v === 0) obj.def = (obj.def === undefined) ? parts[0] : obj.def;
                    }
                } else {
                    obj.def = obj.def || '';
                }
                names.push(obj);
            } else {
                names.push(null);
            }

            name = $(this).data('buttons');

            if (name) {
                var bs = name.split(' ');
                buttons.push(bs);
            } else {
                buttons.push(null);
            }
        });

        $table.data('names', names);

        var text = '';
        for (var v = 0; v < values.length; v++) {
            var idName = values[v] && values[v].id;
            if (!idName && values[v]) {
                if (names[0] === '_index') {
                    idName = values[v][names[1]];
                } else {
                    idName = values[v][names[0]];
                }
            }
            text += '<tr ' + (idName ? 'data-id="' + idName + '"' : '') + ' data-index="' + v + '">';

            for (var i = 0; i < names.length; i++) {
                text += '<td';
                var line = '';
                var style = '';
                var tdstyle = '';
                if (names[i]) {
                    if (names[i].name !== '_index') {
                        tdstyle = names[i].tdstyle || '';
                        if (tdstyle && tdstyle[0] !== ';') tdstyle = ';' + tdstyle;
                    }
                    if (names[i].name === '_index') {
                        style = (names[i].style ? names[i].style : 'text-align: right;');
                        line += (v + 1);
                    } else if (names[i].type === 'checkbox') {
                        // Mod: disabled Checkbox
                        line += '<input style="' + (names[i].style || '') + '" class="values-input filled-in" type="checkbox" data-index="' + v + '" data-name="' + names[i].name + '" ' + (values[v][names[i].name] ? 'checked' : '') + '" data-old-value="' + (values[v][names[i].name] === undefined ? '' : values[v][names[i].name]) + '" disabled="true"/>';
                        if (isMaterialize) {
                            line += '<span></span>';
                        }
                    } else if (names[i].type.substring(0, 6) === 'select') {
                        line += (names[i].type.substring(7, 16) === 'multiple' ? '<select multiple style="' : '<select style="') + (names[i].style ? names[i].style : 'width: 100%') + '" class="values-input" data-index="' + v + '" data-name="' + names[i].name + '">';
                        var options;
                        if (names[i].name === 'room') {
                            options = $table.data('rooms');
                        } else if (names[i].name === 'func') {
                            options = $table.data('functions');
                            if (names[i].type === 'select multiple') delete options[_('none')];
                        } else {
                            options = names[i].options;
                        }

                        var val = (values[v][names[i].name] === undefined ? '' : values[v][names[i].name]);
                        if (typeof val !== 'object') val = [val];
                        for (var p in options) {
                            line += '<option value="' + p + '" ' + (val.indexOf(p) !== -1 ? ' selected' : '') + '>' + options[p] + '</option>';
                        }
                        line += '</select>';
                    } else {
                        // Mod: readonly input (text)
                        line += '<input class="values-input" style="' + (names[i].style ? names[i].style : 'width: 100%') + '" type="' + names[i].type + '" data-index="' + v + '" data-name="' + names[i].name + '" readonly/>';
                    }
                }

                if (buttons[i]) {
                    style = 'text-align: center; white-space: nowrap;';
                    for (var b = 0; b < buttons[i].length; b++) {
                        if ((!v && buttons[i][b] === 'up') || (v === values.length - 1 && buttons[i][b] === 'down')) {
                            if (isMaterialize) {
                                line += '<a data-command="' + buttons[i][b] + '" class="values-buttons btn-floating btn-small waves-effect waves-light disabled"><i class="material-icons">add</i></a>';
                            } else {
                                line += '<button data-command="' + buttons[i][b] + '" class="values-buttons" disabled>&nbsp;</button>';
                            }
                        } else if (buttons[i][b] === 'assignLink') {
                            // Mod: abhängig ob verlinkt ist Button disabled
                            if (isMaterialize) {
                                if (JSON.stringify(values[v].isLinked) === "true") {
                                    line += '<a data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons btn-floating btn-small waves-effect waves-light" disabled="true"><i class="material-icons">link</i></a>';
                                } else {
                                    line += '<a data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons btn-floating btn-small waves-effect waves-light"><i class="material-icons">link</i></a>';
                                }
                            } else {
                                if (JSON.stringify(values[v].isLinked) === "true") {
                                    line += '<button data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons" disabled="true"></button>';
                                } else {
                                    line += '<button data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons"></button>';
                                }
                            }
                        } else if (buttons[i][b] === 'openCustom') {
                            if (isMaterialize) {
                                if (JSON.stringify(values[v].isLinked) === "true") {
                                    line += '<a data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons btn-floating btn-small waves-effect waves-light"><i class="material-icons">link</i></a>';
                                } else {
                                    line += '<a data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons btn-floating btn-small waves-effect waves-light" disabled="true"><i class="material-icons">link</i></a>';
                                }
                            } else {
                                if (JSON.stringify(values[v].isLinked) === "true") {
                                    line += '<button data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons"></button>';
                                } else {
                                    line += '<button data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons" disabled="true"></button>';
                                }
                            }
                        } else {
                            if (isMaterialize) {
                                line += '<a data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons btn-floating btn-small waves-effect waves-light"><i class="material-icons">add</i></a>';
                            } else {
                                line += '<button data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons"></button>';
                            }
                        }
                    }
                }
                if (style.length || tdstyle.length) {
                    text += ' style="' + style + tdstyle + '">' + line + '</td>';
                } else {
                    text += '>' + line + '</td>';
                }
            }

            text += '</tr>';
        }
        var $lines = $div.find('.table-lines');
        if (!$lines.length) {
            $table.append('<tbody class="table-lines"></tbody>');
            $lines = $div.find('.table-lines');
        }

        $lines.html(text);

        $lines.find('.values-input').each(function () {
            var $this = $(this);
            var type = $this.attr('type');
            var name = $this.data('name');
            var id = $this.data('index');
            $this.data('old-value', values[id][name]);
            if (type === 'checkbox') {
                $this.prop('checked', values[id][name]);
            } else {
                $this.val(values[id][name]);
            }
        });
        $lines.find('.values-buttons').each(function () {
            var command = $(this).data('command');
            if (command === 'copy') {
                if (!isMaterialize) {
                    $(this).button({
                        icons: { primary: 'ui-icon-copy' },
                        text: false
                    })
                        .css({ width: '1em', height: '1em' });
                } else {
                    $(this).find('i').html('content_copy');
                }

                $(this).on('click', function () {
                    if (!$add.data('maxraw') || ($add.data('raw') < $add.data('maxraw'))) {
                        var id = $(this).data('index');
                        var elem = JSON.parse(JSON.stringify(values[id]));
                        values.push(elem);
                        onChange && onChange();

                        setTimeout(function () {
                            if (typeof tableEvents === 'function') {
                                tableEvents(values.length - 1, elem, 'add');
                            }

                            myValues2table(divId, values, onChange, onReady);
                        }, 100);

                        if ($add.data('maxraw')) {
                            $add.data('raw', $add.data('raw') + 1);
                        }
                    }
                });
            } else
                if (command === 'delete') {
                    if (!isMaterialize) {
                        $(this).button({
                            icons: { primary: 'ui-icon-trash' },
                            text: false
                        })
                            .css({ width: '1em', height: '1em' });
                    } else {
                        $(this).addClass('red').find('i').html('delete');
                    }

                    $(this).on('click', function () {
                        var id = $(this).data('index');
                        var elem = values[id];
                        values.splice(id, 1);
                        onChange && onChange();

                        setTimeout(function () {
                            if (typeof tableEvents === 'function') {
                                tableEvents(id, elem, 'delete');
                            }

                            myValues2table(divId, values, onChange, onReady);
                        }, 100);

                        if ($add.data('maxraw')) {
                            $add.data('raw', $add.data('raw') - 1);
                        }
                    });
                } else if (command === 'up') {
                    if (!isMaterialize) {
                        $(this).button({
                            icons: { primary: 'ui-icon-triangle-1-n' },
                            text: false
                        })
                            .css({ width: '1em', height: '1em' })
                    } else {
                        $(this).find('i').html('arrow_upward');
                    }
                    $(this).on('click', function () {
                        var id = $(this).data('index');
                        var elem = values[id];
                        values.splice(id, 1);
                        values.splice(id - 1, 0, elem);
                        onChange && onChange();
                        setTimeout(function () {
                            myValues2table(divId, values, onChange, onReady);
                        }, 100);
                    });
                } else if (command === 'down') {
                    if (!isMaterialize) {
                        $(this).button({
                            icons: { primary: 'ui-icon-triangle-1-s' },
                            text: false
                        })
                            .css({ width: '1em', height: '1em' });
                    } else {
                        $(this).find('i').html('arrow_downward');
                    }
                    $(this).on('click', function () {
                        var id = $(this).data('index');
                        var elem = values[id];
                        values.splice(id, 1);
                        values.splice(id + 1, 0, elem);
                        onChange && onChange();
                        setTimeout(function () {
                            myValues2table(divId, values, onChange, onReady);
                        }, 100);
                    });
                } else if (command === 'pair') {
                    if (!isMaterialize) {
                        $(this).button({
                            icons: { primary: 'ui-icon-transferthick-e-w' },
                            text: false
                        })
                            .css({ width: '1em', height: '1em' });
                    } else {
                        $(this).find('i').html('leak_add');
                    }
                    $(this).on('click', function () {
                        if (typeof tableEvents === 'function') {
                            var id = $(this).data('index');
                            var elem = values[id];
                            tableEvents(id, elem, 'pair');
                        }
                    }).attr('title', _('pair'));
                } else if (command === 'unpair') {
                    if (!isMaterialize) {
                        $(this).button({
                            icons: { primary: 'ui-icon-scissors' },
                            text: false
                        })
                            .css({ width: '1em', height: '1em' });
                    } else {
                        $(this).find('i').html('leak_remove');
                    }
                    $(this).on('click', function () {
                        if (typeof tableEvents === 'function') {
                            var id = $(this).data('index');
                            var elem = values[id];
                            tableEvents(id, elem, 'unpair');
                        }
                    }).attr('title', _('unpair'));
                } else if (command === 'edit') {
                    if (!isMaterialize) {
                        $(this).button({
                            icons: { primary: 'ui-icon-pencil' },
                            text: false
                        })
                            .css({ width: '1em', height: '1em' });
                    } else {
                        $(this).find('i').html('edit');
                    }
                    $(this).on('click', function () {
                        var id = $(this).data('index');
                        if (typeof editLine === 'function') {
                            setTimeout(function () {
                                editLine(id, JSON.parse(JSON.stringify(values[id])), function (err, id, newValues) {
                                    if (!err) {
                                        if (JSON.stringify(values[id]) !== JSON.stringify(newValues)) {
                                            onChange && onChange();
                                            values[id] = newValues;
                                            myValues2table(divId, values, onChange, onReady);
                                        }
                                    }
                                });
                            }, 100);
                        }
                    });
                } else if (command === 'assignLink') {
                    // Mod: eigener button für link
                    if (!isMaterialize) {
                        $(this).button({
                            icons: { primary: 'ui-icon-pencil' },
                            text: false
                        })
                            .css({ width: '1em', height: '1em' });
                    } else {
                        $(this).find('i').html('link');     //Icon festlegen
                    }
                    $(this).on('click', function () {
                        var id = $(this).data('index');
                    }).attr('title', _('assign link'));
                } else if (command === 'openCustom') {
                    // Mod: eigener button für custom dlg
                    if (!isMaterialize) {
                        $(this).button({
                            icons: { primary: 'ui-icon-gear' },
                            text: false
                        })
                            .css({ width: '1em', height: '1em' });
                    } else {
                        $(this).find('i').html('build');     //Icon festlegen
                    }
                    $(this).on('click', function () {
                        var id = $(this).data('index');
                    }).attr('title', _('Settings'));
                }
        });

        $lines.find('.values-input').on('change.adaptersettings', function () {
            if ($(this).attr('type') === 'checkbox') {
                if ($(this).prop('checked').toString() !== $(this).data('old-value')) onChange();
                values[$(this).data('index')][$(this).data('name')] = $(this).prop('checked');
            } else {
                if ($(this).val() !== $(this).data('old-value')) onChange();
                values[$(this).data('index')][$(this).data('name')] = $(this).val();
            }
        }).on('keyup', function () {
            $(this).trigger('change.adaptersettings');
        });
    }
    if (isMaterialize) {
        if (!divId) {
            M.updateTextFields();
            $('select').select();
        } else {
            M.updateTextFields('#' + divId);
            $('#' + divId).find('select').select();
        }

        // workaround for materialize checkbox problem
        $div.find('input[type="checkbox"]+span').off('click').on('click', function () {
            var $input = $(this).prev();
            if (!$input.prop('disabled')) {
                $input.prop('checked', !$input.prop('checked')).trigger('change');
            }
        });
    }
    if (typeof onReady === 'function') onReady();
}