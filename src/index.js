import './style.css'
import paper from 'paper'
import $ from 'jquery'
import 'popper.js'
import 'bootstrap'
// const file = require('fs');
// const savePath = require('path');
require('dotenv').config();

let host = "http://127.0.0.1:8000";
let xMeters;
let yMeters;
let placeId;
let currentStage; // 1 - lines; 2 - rooms
let schemaId; // Sevak 20.05
let cntctPointsGroup;
let roomPoits;



paper.install(window);
window.$ = window.jQuery = $;

$(document).ready(function () { // Sevak 20.05
    schemaId = $('#schemaId').val();
    placeId = $('#placeId').val();
    if (schemaId == 0){
        if (!localStorage.getItem('paths')) {
            $(document).trigger('createNewSchema');
        } else $(document).trigger('start')
    }
    else $(document).trigger('start');
});

$(document).on('createNewSchema', function () {
    $('#schemaCreator').modal('show');

    $('#beginPainting').click(function () {
        xMeters = $('#width').val();
        yMeters = $('#height').val();
        $('#schemaCreator').modal('hide');
        $(document).trigger('start');
        currentStage = 1;
    });
    $('#loadSchema').click(function () {
        placeId = $('#placeId').val();
        $(document).trigger('start');
        $('#schemaCreator').modal('hide');
        currentStage = 1;
    })
});


$(document).on('start', function () {
    paper.setup('canvas');
    let group = new Group(); // все path включая area
    let path = new Path(); // прямая рисуемая пользователем
    let rectangle; // если обнаружено помещение объект будет тут
    let isRoom = false; // пользователь решил что будет сдавать true
    let isClosed = true;
    let groupRooms = new Group();
    let groupRoomHelpers = new Group();
    let mainNearestPoint = new Point();
    let nearestContactPoint = new Point();
    let roomCounter = 0; // счетчик помещений
    let rulersSmallPointX = 5;
    let rulersSmallPointY = 5;
    let SmallestPointX = 50;
    let SmallestPointY = 50;
    let BiggestPointX = 700;
    let BiggestPointY = 700;

    let doorsGroup = new Group();
    let doorItem = new Group();
    let doorSize = 1;
    let doorRotation = 0;

    let windowsGroup = new Group();
    let windowItem = new Group();
    let windowSize = 1;
    let windowRotation = 0;

    let area;
    let contactPoints = [];

    if (localStorage.getItem('paths') && schemaId == 0) { // Sevak 20.05
        xMeters = localStorage.getItem('width');
        yMeters = localStorage.getItem('height');
        currentStage = parseInt(localStorage.getItem('stage'));
        ratioCalculation(xMeters, yMeters);
        drawGrid();
        drawRuler();
        let parentGroup = new Group();
        parentGroup.importSVG(localStorage.getItem('paths'));
        group = parentGroup.children[0];
        if (group.children.length > 1) isClosed = group.lastChild.closed;
        area = group.firstChild;

        if (localStorage.getItem('rooms')) {
            let groupRoomsParent = new Group();
            groupRoomsParent.importSVG(localStorage.getItem('rooms'));
            groupRooms = groupRoomsParent.firstChild;
            roomCounter = groupRooms.children.length;
        }

        if (localStorage.getItem('doors')) {
            let groupDoorsParent = new Group();
            groupDoorsParent.importSVG(localStorage.getItem('doors'));
            doorsGroup = groupDoorsParent.firstChild;
        }
        if (localStorage.getItem('windows')) {
            let groupWindowsParent = new Group();
            groupWindowsParent.importSVG(localStorage.getItem('windows'));
            windowsGroup = groupWindowsParent.firstChild;
        }
    }

    if (schemaId > 0) {
        let schema = getPlaceSchema(schemaId)
            .then(data => {
                xMeters = data.width;
                yMeters = data.height;
                currentStage = 1;
                ratioCalculation(xMeters, yMeters);
                drawGrid();
                drawRuler();
                let parentGroup = new Group();
                parentGroup.importSVG(data.paths);
                group = parentGroup.children[0];
                if (group.children.length > 1) isClosed = group.lastChild.closed;
                area = group.firstChild;

                let groupRoomsParent = new Group();

                groupRoomsParent.importSVG(data.rooms);
                groupRooms = groupRoomsParent.firstChild;
                roomCounter = groupRooms.children.length;
                if (data.doors) {
                    let groupDoorsParent = new Group();
                    groupDoorsParent.importSVG(data.rooms);
                    doorsGroup = groupDoorsParent.firstChild;
                }
                if (data.windows) {
                    let groupWindowsParent = new Group();
                    groupWindowsParent.importSVG(data.rooms);
                    windowsGroup = groupWindowsParent.firstChild;
                }
            });
    }

    if (!localStorage.getItem('paths') && schemaId == 0) {
        drawArea();
    }

    async function getPlaceSchema(placeId) {
        // ----------------------------------------
        return fetch(host + "/getSchemaById", {
            crossDomain: true,
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify({
                'placeId': placeId,
            })
        })
            .then(response => response.json())
            .then(body => {
                return body;
            })

        // ---------------------------------------------------------
        // const resp = await fetch(host + "/getSchemaById", {
        //     crossDomain: true,
        //     method: 'POST',
        //     mode: 'cors',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //
        //     body: JSON.stringify({
        //         'placeId': placeId,
        //     })
        // });
        // const json = await resp.json();
        // return json;
    }

    function figureOutStage() {
        switch (currentStage) {
            case 1: {
                $('#helperText').text('Нарисуйте стены без учета окон и дверей, затем нажмите далее');
                $('#previousStage').attr('disabled', true);
                $('#nextStage').attr('disabled', false);
                window.app.lines.activate();
                break;
            }
            case 2: {
                $('#helperText').text('Нажимайте внутри помещения для определения комнаты');
                $('#nextStage').attr('disabled', true);
                $('#previousStage').attr('disabled', false);
                window.app.rooms.activate();
                break;
            }
            case 3: {
                break;
            }
        }
    }

    function ratioCalculation(x, y) {

        if (parseFloat(x) > parseFloat(y)) {
            let ratio = (x / y);
            BiggestPointY = ((BiggestPointX - SmallestPointX) / ratio) + Number(SmallestPointX);
        }
        if (parseFloat(y) > parseFloat(x)) {
            let ratio = y / x;
            BiggestPointX = ((BiggestPointY - SmallestPointX) / ratio) + Number(SmallestPointX);
        }
    }

    function rounded(number) {
        return +number.toFixed(1);
    }

    function getPxInMeter() {
        let maxPx = compareSides(BiggestPointX, BiggestPointY) - SmallestPointX;
        let maxInputMeters = compareSides(Number(xMeters), Number(yMeters));
        let pxInMeter = maxInputMeters / maxPx;
        return pxInMeter;
    }

    function getGridShift(nMeters) {
        let maxPx = compareSides(BiggestPointX, BiggestPointY) - SmallestPointX;
        let maxInputMeters = compareSides(Number(xMeters), Number(yMeters));
        let shift = (maxPx * nMeters) / Number(maxInputMeters);
        return shift;
    }

    function getCellSize() {

        let avgMeters = (Number(xMeters) + Number(yMeters)) / 2;

        const lowerLimit = 10;
        const upperLimit = 16;
        let pxInMeter;

        if (avgMeters <= 10) {
            return 1;
        }

        for (let i = 6; i != 0; i--) {
            pxInMeter = avgMeters / i;
            //console.log("px 1-5");
            if (Number(pxInMeter) >= lowerLimit && Number(pxInMeter) <= upperLimit) {
                //   console.log(pxInMeter);
                // console.log("В 1 клетке м = " + i);
                return i;
            }
        }

        for (let i = 10; i < 55; i = i + 5) {
            pxInMeter = avgMeters / i;
            if (pxInMeter >= lowerLimit && pxInMeter <= upperLimit) {
                return i;
            }
        }
    }

    function compareSides(x, y) {
        if (y > x) {
            return y;
        } else {
            return x;
        }
    }

    function getSmallerSide(x, y) {
        if (y > x) {
            return x;
        } else {
            return y;
        }
    }

    function drawRuler() {
        var myPath = new Path();
        myPath.strokeColor = 'grey';
        myPath.strokeWidth = 1;
        myPath.add(new Point(rulersSmallPointX, rulersSmallPointY), new Point(BiggestPointX, rulersSmallPointY));


        myPath.add(new Point(rulersSmallPointX, rulersSmallPointY), new Point(rulersSmallPointX, BiggestPointY));
        // myPath.add(new Point(0, (BiggestPointY - 10)), new Point(rulersSmallPointX, BiggestPointY));
        // myPath.add(new Point((rulersSmallPointX + 5), (BiggestPointY - 10)), new Point(rulersSmallPointX, BiggestPointY));

        var shift = 50;


        var cellSize = getCellSize();
        var nMeters = yMeters / cellSize;
        var middlePoint = 25;
        for (var i = 0; i < nMeters; i++) {

            var myPath = new Path();
            myPath.strokeColor = 'red';
            myPath.strokeWidth = 3;
            myPath.add(new Point((rulersSmallPointX - 6), shift), new Point((rulersSmallPointX + 6), shift));
            var textMeters = new PointText((rulersSmallPointX + 7), shift);
            textMeters.content = i * cellSize;
            shift += getGridShift(cellSize);
            //   console.log("shift ruler " + shift);
        }
        var myPath = new Path();
        myPath.strokeColor = 'red';
        myPath.strokeWidth = 3;
        myPath.add(new Point((rulersSmallPointX - 6), BiggestPointY), new Point((rulersSmallPointX + 6), BiggestPointY));
        var textMeters = new PointText((rulersSmallPointX + 7), BiggestPointY);
        textMeters.content = yMeters;

        var shift = 50;
        nMeters = xMeters / cellSize;
        for (i = 0; i < nMeters; i++) {

            var myPath = new Path();
            myPath.strokeColor = 'red';
            myPath.strokeWidth = 3;
            myPath.add(new Point(shift, (rulersSmallPointX - 6)), new Point(shift, (rulersSmallPointX + 6)));
            var textMeters = new PointText(shift - 3, (rulersSmallPointX + 20));
            textMeters.content = i * cellSize;
            shift += getGridShift(cellSize);
        }

        var myPath = new Path();
        myPath.strokeColor = 'red';
        myPath.strokeWidth = 3;
        myPath.add(new Point(BiggestPointX, (rulersSmallPointX - 6)), new Point(BiggestPointX, (rulersSmallPointX + 6)));
        var textMeters = new PointText(BiggestPointX + 3, (rulersSmallPointX + 20));
        textMeters.content = xMeters;

    }

    function drawGrid() {

        let tempShift = 50;

        let cellSize = getCellSize();
        // console.log("cell size" + cellSize);
        let nMeters = yMeters / cellSize;
        // console.log("n meters " + nMeters);
        for (let i = 1; i < nMeters; i++) {

            tempShift += getGridShift(cellSize);
            let myPath = new Path();
            myPath.strokeColor = 'grey';
            myPath.strokeWidth = 1;
            myPath.add(new Point(SmallestPointX, tempShift), new Point(BiggestPointX, tempShift));
        }

        tempShift = 50;

        nMeters = xMeters / getCellSize();

        for (let i = 1; i < nMeters; i++) {
            //    console.log(tempCord);
            tempShift += getGridShift(cellSize);
            let myPath = new Path();
            myPath.strokeColor = 'grey';
            myPath.strokeWidth = 1;
            myPath.add(new Point(tempShift, SmallestPointY), new Point(tempShift, BiggestPointY));
        }
    }

    function drawArea() {

        xMeters = document.getElementById("x");
        xMeters = x.value;
        yMeters = document.getElementById("y");
        yMeters = y.value;
        ratioCalculation(xMeters, yMeters);
        drawGrid();
        drawRuler();


        area = new Path.Rectangle(new Point(SmallestPointX, SmallestPointY), new Point(BiggestPointX, BiggestPointY));
        area.strokeWidth = 5;
        area.strokeColor = 'black';
        area.name = 'area';

        for(let i = 0 ; i < area.segments.length; i ++){
            contactPoints.push(area.segments[i].point);
        }

        group.addChild(area);

    }

    function getRoundedAngle(angle) {
        let currentAngle = angle;
        if (angle.angle >= 45 && angle.angle < 135) {
            currentAngle.angle = 90;
        } else if (angle.angle < 45 && angle.angle >= -45) {
            currentAngle.angle = 0;
        } else if (angle.angle < -45 && angle.angle >= -135) {
            currentAngle.angle = -90;
        } else if (angle.angle < -135 || angle.angle >= 135) {
            currentAngle.angle = 180;
        }
        return currentAngle;
    } // возвращает выравненный угол

    function cutHorizontalLine() {
        var location = path.lastSegment.point;
        if (location.x > BiggestPointX) {
            path.lastSegment.point.x = BiggestPointX;
        } else if (location.x < SmallestPointX) {
            path.lastSegment.point.x = SmallestPointX;
        }
    } //отрезать лишнее если горизонтальна€ лини€ вышла за пределы

    function cutVerticalLine() { //отрезать лишнее если вертикальна€ лини€ вышла за пределы
        let location = path.lastSegment.point;
        if (location.y > BiggestPointY) {
            path.lastSegment.point.y = BiggestPointY;
        } else if (location.y < SmallestPointY) {
            path.lastSegment.point.y = SmallestPointY;
        }
    } //отрезать лишнее если вертикальна€ лини€ вышла за пределы

    function cutPath (shortPath, path) {
        if (shortPath) {
            path.lastSegment.point = shortPath.lastSegment.point;
        }
    }

    function doorPaint() {
        doorItem = new Group();
        let whiteStroke = new Path(new Point(mainNearestPoint),
            new Point(mainNearestPoint.x + 30, mainNearestPoint.y));
        let blackStroke = new Path(new Point(mainNearestPoint.x + 30, mainNearestPoint.y),
            new Point(mainNearestPoint.x + 30, mainNearestPoint.y + 30));
        let arc = new Path.Arc(whiteStroke.firstSegment.point,
            new Point(whiteStroke.firstSegment.point.x+(30/3), blackStroke.lastSegment.point.y-(30/3)), blackStroke.lastSegment.point);
        whiteStroke.strokeColor = 'white';
        whiteStroke.strokeWidth = 5;
        blackStroke.strokeColor = 'black';
        blackStroke.strokeWidth = 3;
        arc.strokeColor = 'black';
        arc.dashArray = [10,4];
        doorItem.addChild(whiteStroke);
        doorItem.addChild(blackStroke);
        doorItem.addChild(arc);
        doorItem.rotate(doorRotation, doorItem.firstChild.firstSegment.point);
        doorItem.scale(doorSize, doorItem.firstChild.firstSegment.point);
        doorsGroup.addChild(doorItem);
        doorsGroup.bringToFront();
    }

    function doorMoving (mainNearestPoint) {
        doorItem = new Group();
        let whiteStroke = new Path(new Point(mainNearestPoint),
            new Point(mainNearestPoint.x + 30, mainNearestPoint.y));
        let blackStroke = new Path(new Point(mainNearestPoint.x + 30, mainNearestPoint.y),
            new Point(mainNearestPoint.x + 30, mainNearestPoint.y + 30));
        let arc = new Path.Arc(whiteStroke.firstSegment.point,
            new Point(whiteStroke.firstSegment.point.x+(30/3), blackStroke.lastSegment.point.y-(30/3)),
            blackStroke.lastSegment.point);
        whiteStroke.strokeColor = 'white';
        whiteStroke.strokeWidth = 5;
        blackStroke.strokeColor = 'black';
        blackStroke.strokeWidth = 3;
        arc.strokeColor = 'black';
        arc.dashArray = [10,4];
        doorItem.addChild(whiteStroke);
        doorItem.addChild(blackStroke);
        doorItem.addChild(arc);
        doorItem.rotate(doorRotation, doorItem.firstChild.firstSegment.point);
        doorItem.scale(doorSize, doorItem.firstChild.firstSegment.point);
        doorItem.bringToFront();
        doorItem.removeOnMove();
    }

    function chooseDoorDirection (nearestPoint) {
        let hitTest = group.hitTest(nearestPoint);
        if (hitTest.location) {
            if (hitTest.location.curve.isHorizontal()) {
                if ((Math.abs(doorRotation) / 90) % 2 === 1) {
                    doorRotation = 0;
                }
            } else if ((Math.abs(doorRotation) / 90) % 2 === 0) {
                doorRotation = 270;
            }
        }
    }

    function windowPaint (point) {
        windowItem = new Group();
        let whiteStroke = new Path(new Point(point.x-13, point.y), new Point(point.x+13, point.y));
        whiteStroke.strokeWidth = 7;
        whiteStroke.strokeColor = "white";
        let blackStroke = new Path(new Point(point.x-13, point.y), new Point(point.x+13, point.y));
        blackStroke.strokeWidth = 1;
        blackStroke.strokeColor = "gray";
        windowItem.addChild(whiteStroke);
        windowItem.addChild(blackStroke);
        windowItem.scale(windowSize, whiteStroke.interiorPoint);
        windowItem.rotate(windowRotation, whiteStroke.interiorPoint);
        windowsGroup.addChild(windowItem);
        windowsGroup.bringToFront();
    }

    function windowMoving (point){
        windowItem = new Group();
        let whiteStroke = new Path(new Point(point.x-13, point.y), new Point(point.x+13, point.y));
        whiteStroke.strokeWidth = 7;
        whiteStroke.strokeColor = "white";
        let blackStroke = new Path(new Point(point.x-13, point.y), new Point(point.x+13, point.y));
        blackStroke.strokeWidth = 1;
        blackStroke.strokeColor = "gray";
        windowItem.addChild(whiteStroke);
        windowItem.addChild(blackStroke);
        windowItem.scale(windowSize, whiteStroke.interiorPoint);
        windowItem.rotate(windowRotation, whiteStroke.interiorPoint);
        windowItem.bringToFront();
        windowItem.removeOnMove();
    }

    function chooseWindowDirection (nearestPoint) {
        let hitTest = area.hitTest(nearestPoint);
        if (hitTest.location) {
            if (hitTest.location.curve.isHorizontal()) {
                if ((Math.abs(windowRotation) / 90) % 2 === 1) {
                    windowRotation = 0;
                }
            } else if ((Math.abs(windowRotation) / 90) % 2 === 0) {
                windowRotation = 90;
            }
        }
    }

    function findRoom(event) {
        let cross = {
            topLine: new Path(event.point, new Point(event.point.x, event.point.y - 1000)),
            bottomLine: new Path(event.point, new Point(event.point.x, event.point.y + 1000)),
            rightLine: new Path(event.point, new Point(event.point.x + 1000, event.point.y)),
            leftLine: new Path(event.point, new Point(event.point.x - 1000, event.point.y)),
        }
        for (let line in cross) {
            cross[line] = findShortestPoint(cross[line]);
        }
        let room = new Path.Rectangle(
            new Point(cross.leftLine.firstSegment.point.x + 2,
                cross.topLine.firstSegment.point.y + 2),
            new Point(cross.rightLine.firstSegment.point.x - 2,
                cross.bottomLine.firstSegment.point.y - 2)
        );
        room.fillColor = 'green';
        room.opacity = 0.5;
        room.name = 'room'+roomCounter;
        roomCounter++;
        groupRooms.addChild(room);
    }

    function findShortestPoint(path) {
        let intersectionsArray = [];
        let intersections;
        for (let i = 0; i < group.children.length; i++) {
            intersections = path.getIntersections(group.children[i]);
            if (intersections.length !== 0) {
                intersectionsArray.push(intersections[0]);
            }
        }
        if (intersectionsArray.length !== 0) {
            let shortestLine = new Path(new Point(intersectionsArray[0].point), new Point(path.firstSegment.point));
            let shortestLineIndex = 0;
            let currentLine;
            for (let i = 1; i < intersectionsArray.length; i++) {
                currentLine = new Path(new Point(intersectionsArray[i].point), new Point(path.firstSegment.point));
                if (shortestLine.length > currentLine.length) {
                    shortestLine = currentLine;
                    shortestLineIndex = i;
                }
            }
            return shortestLine;
        } else return 0;
    }

    function findShortestLine (line) {
        let intersectionsArray = [];
        let intersections;
        for (let i = 0; i < group.children.length; i++) {
            intersections = line.getIntersections(group.children[i]);
            if (intersections.length !== 0) {
                intersectionsArray.push(intersections[0]);
            }
        }
        if (intersectionsArray.length !== 0) {
            let shortestLine = new Path(new Point(path.firstSegment.point), new Point(intersectionsArray[0].point));
            let currentLine;
            for (let i = 1; i < intersectionsArray.length; i++) {
                currentLine = new Path(new Point(path.firstSegment.point), new Point(intersectionsArray[i].point));
                if (currentLine.length < 5) {
                    continue;
                }
                if (shortestLine.length > currentLine.length || shortestLine.length < 5) {
                    shortestLine = currentLine;
                }
            }
            if (shortestLine.length < 5) {
                return 0;
            }
            return shortestLine;
        } else return 0;
    }

    function showIntersections() {
        for (let i = 0; i < group.children.length; i++) {
            let intersectPoint = path.getIntersections(group.children[i]);
            intersectPoint.map(function (point) {
                let intersect = new Path.Circle({
                    center: point.point,
                    radius: 5,
                    fillColor: '#009dec'
                }).removeOnUp();
                intersect.removeOnDrag();
            });
        }
    } // рисует точки пересечени€

    function showLengthHorizontal() {
        let textLength = new PointText(path.interiorPoint.x - 10, path.interiorPoint.y - 5);
        path.length < (BiggestPointX - SmallestPointX) ?
            textLength.content = rounded(((path.length) * getPxInMeter())) + ' м' :
            textLength.content = Math.round((BiggestPointX - SmallestPointX) * getPxInMeter()) + ' м'; // ?
        textLength.removeOnDrag();
        textLength.removeOnUp();
    } // показывать длину горизонтальной

    function showLengthVertical() {
        // console.log(path.length);
        let textLength = new PointText(path.interiorPoint.x + 5, path.interiorPoint.y);
        path.length < (BiggestPointY - SmallestPointY) ?
            textLength.content = rounded(((path.length) * getPxInMeter())) + ' м' :
            textLength.content = Math.round((BiggestPointY - SmallestPointY) * getPxInMeter()) + ' м';
        textLength.removeOnDrag();
        textLength.removeOnUp();
    } // показывать длину вертикальной

    function showSameLengthHorizontalLines() {
        let currentPoint, anotherPoint, similarLine, similarAnotherLine;
        if (group.children.length > 0) {
            for (let i = 1; i < group.children.length; i++) {
                currentPoint = path.lastSegment.point;
                anotherPoint = group.children[i].lastSegment.point;
                if (currentPoint.x > anotherPoint.x - 1 && currentPoint.x < anotherPoint.x + 1) {
                    path.lastSegment.point.x = anotherPoint.x;
                    //similarLine = new Path(anotherPoint, path.lastSegment.point);
                    similarLine = new Path(new Point(anotherPoint.x, currentPoint.y - 10), new Point(anotherPoint.x, currentPoint.y + 10));
                    similarLine.strokeColor = 'red';
                    similarLine.strokeWidth = 3;
                    similarAnotherLine = new Path(new Point(anotherPoint.x, anotherPoint.y - 10), new Point(anotherPoint.x, anotherPoint.y + 10));
                    similarAnotherLine.strokeColor = 'red';
                    similarAnotherLine.strokeWidth = 3;
                    similarLine.removeOnDrag();
                    similarAnotherLine.removeOnDrag();
                    similarLine.removeOnUp();
                    similarAnotherLine.removeOnUp();
                }
            }
        }
    } // красные полоски при положении на одной горизонтальной линии

    function showSameLengthVerticalLines() {
        let currentPoint, anotherPoint, similarLine, similarAnotherLine;
        if (group.children.length > 0) {
            for (let i = 1; i < group.children.length; i++) {
                currentPoint = path.lastSegment.point;
                anotherPoint = group.children[i].lastSegment.point;
                if (currentPoint.y > anotherPoint.y - 1 && currentPoint.y < anotherPoint.y + 1) {
                    path.lastSegment.point.y = anotherPoint.y;
                    similarLine = new Path(new Point(currentPoint.x - 10, currentPoint.y), new Point(currentPoint.x + 10, currentPoint.y));
                    similarLine.strokeColor = 'red';
                    similarLine.strokeWidth = 3;
                    similarAnotherLine = new Path(new Point(anotherPoint.x - 10, anotherPoint.y), new Point(anotherPoint.x + 10, anotherPoint.y));
                    similarAnotherLine.strokeColor = 'red';
                    similarAnotherLine.strokeWidth = 3;
                    similarLine.removeOnDrag();
                    similarAnotherLine.removeOnDrag();
                    similarLine.removeOnUp();
                    similarAnotherLine.removeOnUp();
                }
            }
        }
    } // красные полоски при положении на одной вертикальной линии

    function isTouchRoom(line) {
        let intersections = [];
        for (let i = 0; i < groupRoomHelpers.children.length; i++) {
            intersections = line.getIntersections(groupRoomHelpers.children[i]);
            if (intersections.length !== 0) {
                return true;
            }
        }
        return false;
    }

    function getNearestPointCoord (event, group) {
        let nearestPoint = new Point();
        let pointsArray = [];

        for (let i = 0; i < group.children.length; i++) {
            nearestPoint = group.children[i].getNearestPoint(event.point);
            pointsArray.push(nearestPoint);
        }
        let nearestLength = new Path(pointsArray[0], event.point).length;
        nearestPoint = pointsArray[0];
        for (let i = 1; i < pointsArray.length; i++) {
            if (nearestLength > new Path(pointsArray[i], event.point).length) {
                nearestLength = new Path(pointsArray[i], event.point).length;
                nearestPoint = pointsArray[i];
            }
        }
        mainNearestPoint = nearestPoint;
    }

    function getNearestContactPoint (event, group, radiusSize = 5) {
        let currentChildren;
        let nearestLength = new Path(cntctPointsGroup.firstChild.interiorPoint, event.point).length;
        let nearestPoint = cntctPointsGroup.firstChild;
        let hitResult;
        for (let i = 1; i < cntctPointsGroup.children.length; i++) {
            currentChildren = cntctPointsGroup.children[i];
            hitResult = cntctPointsGroup.hitTest(currentChildren.interiorPoint);
            if (!hitResult.item.selected) {
                if (nearestLength > new Path(currentChildren.interiorPoint, event.point).length) {
                    nearestLength = new Path(currentChildren.interiorPoint, event.point).length;
                    nearestPoint = currentChildren;
                }
            }
        }
        nearestContactPoint = nearestPoint;
        let circle = new Path.Circle({
            center: nearestContactPoint.interiorPoint,
            radius: radiusSize,
            fillColor: '#FFA500'
        }).removeOnMove();
        circle.removeOnDown();
    }

    function finishPath() {
        let nearestPoint = new Point();
        let pointsArray = [];

        for (let i = 0; i < group.children.length; i++) {
            nearestPoint = group.children[i].getNearestPoint(path.lastSegment.point);
            pointsArray.push(nearestPoint);
        }
        let nearestLength = new Path(pointsArray[0], path.lastSegment.point).length;
        nearestPoint = pointsArray[0];
        for (let i = 1; i < pointsArray.length; i++) {
            if (nearestLength > new Path(pointsArray[i], path.lastSegment.point).length) {
                nearestLength = new Path(pointsArray[i], path.lastSegment.point).length;
                nearestPoint = pointsArray[i];
            }
        }
        if (nearestLength < 5 && nearestLength !== 0) {
            path.lastSegment.point = nearestPoint;
            path.closed = true;
            isClosed = true;
        }
    }

    function isInnerWall(hitResult) {
        if (hitResult.type === 'stroke' && hitResult.item.name !== "area") {
            return true;
        } else return false;
    }

    async function postSchema() {
        {
            let fullSchema = paper.project.exportSVG({asString: true});
            let rooms = localStorage.getItem('rooms') ? localStorage.getItem('rooms') : "";
            let doors = localStorage.getItem('doors') ? localStorage.getItem('doors'): "";
            let windows = localStorage.getItem('windows') ? localStorage.getItem('windows'): "";
            let paths = localStorage.getItem('paths') ? localStorage.getItem('paths') : "";
            let width = localStorage.getItem('width');
            let height = localStorage.getItem('height');


            fetch(host + "/fetchSchema", {
                crossDomain: true,
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',

                    // 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },

                body: JSON.stringify({
                    'placeId': $('#placeId').val(),
                    'fullSchema': fullSchema,
                    'rooms': rooms,
                    'paths': paths,
                    'width': width,
                    'height': height,
                    'doors' : doors,
                    'windows': windows
                })
            })
            .then(response => response.json())
            .then(body => {
                    // const test = body.getReader();

                    console.log(body);
                })
        }
    }


    // MOUSE HANDLING
    window.app = {
        lines: new Tool({
            onMouseDown: function (event) {
                path = new Path();
                path.fullySelected = true;
                path.strokeColor = 'blue';
                path.strokeWidth = 3;
                if (isClosed) {
                    path.add(mainNearestPoint, event.point);
                } else {
                    path.add(group.lastChild.lastSegment.point, event.point);
                }
                path.lastSegment.point = event.point;
                let angle = path.lastSegment.point.subtract(path.firstSegment.point);
                path.lastSegment.point = path.firstSegment.point.add(getRoundedAngle(angle));
                cutPath(findShortestLine(path), path);
                groupRooms.bringToFront();
                group.bringToFront();
            },

            onMouseDrag: function (event) {
                path.lastSegment.point = event.point;
                let angle = path.lastSegment.point.subtract(path.firstSegment.point);
                path.lastSegment.point = path.firstSegment.point.add(getRoundedAngle(angle));
                cutPath(findShortestLine(path), path);
                showIntersections();
                if (path.firstCurve.isHorizontal()) {
                    showSameLengthHorizontalLines();
                    showLengthHorizontal();
                } else {
                    showSameLengthVerticalLines();
                    showLengthVertical();
                }

            },

            onMouseUp: function (event) {
                path.fullySelected = false;
                path.strokeColor = 'black';
                if (path.length < 20) {
                    path.remove();
                } else {
                    cutPath(findShortestLine(path), path);
                    if (path.firstCurve.isHorizontal()) {
                        cutHorizontalLine();
                    } else cutVerticalLine();
                    let hitResult = group.hitTest(path.lastSegment.point);
                    if (hitResult) {
                        if (hitResult.type === 'stroke') {
                            isClosed = true;
                            path.closed = true;
                        }
                    } else {
                        isClosed = false;
                        path.closed = false;
                    }
                    finishPath();
                    group.addChild(path);
                    let firstPoint = path.firstSegment.point;
                    let lastPoint = path.lastSegment.point;

                    contactPoints.push(firstPoint);
                    contactPoints.push(lastPoint);
                }
                saveProgress();
                console.log(group);

            },

            onMouseMove: function onMouseMove(event) {
                figureOutStage();
                let circle;
                if (area) {
                    if (isClosed) {
                        getNearestPointCoord(event, group);
                        circle = new Path.Circle({
                            center: mainNearestPoint,
                            radius: 5,
                            fillColor: '#009dec'
                        }).removeOnMove();
                    } else {
                        new Path.Circle({
                            center: group.lastChild.lastSegment.point,
                            radius: 5,
                            fillColor: '#009dec'
                        }).removeOnMove();
                    }
                }
            },
            onKeyDown: function (event) {
                if (event.key === 'backspace') { // удалить предыдущую линию
                    if (group.children.length > 1) {
                        if (isTouchRoom(group.lastChild)) {
                            groupRooms.lastChild.remove();
                            groupRoomHelpers.lastChild.remove();
                        }
                        group.lastChild.remove();
                        isClosed = group.lastChild.closed;
                        saveProgress();
                    }
                }
            }
        }),
        rooms: new Tool({
            onMouseUp: function (event) {
                findRoom(event);
                saveProgress();
            }
        }),

        eraser: new Tool({

            onMouseDown: function (event) {
                let hitResult = group.hitTest(event.point);

                if (!hitResult) {
                    return project.activeLayer.selected = false;
                }
                if (hitResult.item.selected) {
                    hitResult.item.remove();
                }
                if (isInnerWall(hitResult)) {
                    project.activeLayer.selected = false;
                    hitResult.item.selected = true;
                }
            }
        }),

        roomAllocator: new Tool({
            onMouseDown: function (event) {
                let hitResult = cntctPointsGroup.hitTest(nearestContactPoint.interiorPoint);
                if (hitResult) {
                    if (hitResult.item.name == "contactPoint" && hitResult.item.selected == false) {
                        hitResult.item.fillColor = '#1E90FF';
                        hitResult.item.selected = true;
                        roomPoits.push(hitResult.item.interiorPoint);
                    }
                }
            },

            onMouseUp: function (event) {

            },

            onKeyDown: function (event) {
                if(event.key === 'enter'){
                    let room = new Path();
                    for(let i = 0 ; i < roomPoits.length; i++){
                        room.add(roomPoits[i]);
                    }
                    room.strokeColor = 'black';
                    room.strokeWidth = 3;
                    room.fillColor = 'green';
                    room.opacity = 0.5;
                    room.closed = true;
                    room.name = 'room'+roomCounter;
                    groupRooms.addChild(room);

                    roomCounter++;
                    cntctPointsGroup.remove();
                    saveProgress();
                }

                if (event.key === 'backspace'){
                    if(roomPoits.length > 0){
                        let hitResult = cntctPointsGroup.hitTest(roomPoits[roomPoits.length - 1]);
                        if (hitResult.item.name == "contactPoint") {
                            hitResult.item.fillColor = '#696969';
                            hitResult.item.selected = false;
                        }
                        roomPoits.pop();
                        saveProgress();
                    }
                }
            },

            onMouseMove: function (event) {
                getNearestContactPoint(event, cntctPointsGroup, 7);
            }
        }),

        door: new Tool({
            onMouseDown: function (event) {
                getNearestPointCoord(event, group);
                chooseDoorDirection(mainNearestPoint);
                doorPaint();
                saveProgress();
            },
            onMouseMove: function (event) {
                getNearestPointCoord(event, group);
                chooseDoorDirection(mainNearestPoint);
                doorMoving(mainNearestPoint);
            },
            onKeyDown: function (event) {
                doorItem.removeChildren();
                if (event.key === 'w' || event.key === 'ц') {
                    if (doorSize < 1.7) doorSize+=0.1;
                }
                if (event.key === 'a' || event.key === 'ф') {
                    doorRotation-=180;
                }
                if (event.key === 'd' || event.key === 'в') {
                    doorRotation+=180;
                }
                if (event.key === 's' || event.key === 'ы') {
                    if (doorSize > 0.7) doorSize-=0.1;
                }
                doorMoving(mainNearestPoint);
            }
        }),

        window: new Tool({
            point: new Point(),
            onMouseMove: (event) => {
                this.point = area.getNearestPoint(event.point);
                chooseWindowDirection(this.point);
                windowMoving(this.point);
            },
            onMouseDown: (event) => {
                this.point = area.getNearestPoint(event.point);
                chooseWindowDirection(this.point);
                windowPaint(this.point);
                saveProgress();
            },
            onKeyDown: (event) => {
                windowItem.removeChildren();
                if (event.key === 'w' || event.key === 'ц') {
                    if (windowSize < 1.7) windowSize+=0.1;
                }
                if (event.key === 's' || event.key === 'ы') {
                    if (windowSize > 0.7) windowSize-=0.1;
                }
                windowMoving(this.point);
            }
        })
}


    function saveProgress() {
        group.name = 'paths';
        localStorage.clear();
        let paths = group.exportSVG({asString: true});

        if (groupRooms.children.length) {
            let rooms = groupRooms.exportSVG({asString: true});
            // let roomsHelpers = groupRoomHelpers.exportSVG({asString: true});
            localStorage.setItem('rooms', rooms);
            // localStorage.setItem('rooms-helpers', roomsHelpers);
            localStorage.setItem('roomsCounter', roomCounter);
        }
        if (doorsGroup.children.length) {
            let doors = doorsGroup.exportSVG({asString: true});
            localStorage.setItem('doors', doors);
        }
        if (windowsGroup.children.length) {
            let windows = windowsGroup.exportSVG({asString: true});
            localStorage.setItem('windows', windows);
        }
        localStorage.setItem('paths', paths);
        localStorage.setItem('width', xMeters);
        localStorage.setItem('height', yMeters);
        localStorage.setItem('stage', currentStage);
    }
    function deleteProgress () {
        localStorage.removeItem('paths');
        localStorage.removeItem('width');
        localStorage.removeItem('height');
        localStorage.removeItem('rooms');
        localStorage.removeItem('rooms-helpers');
        localStorage.removeItem('roomCounter');
        localStorage.removeItem('stage');
        localStorage.removeItem('doors');
    }

    // EVENT HANDLING
    $('#deleteProgressBtn').click(function () {
        deleteProgress();
        location.reload();
    });

    $('#eraserBtn').click(function () {
        window.app.eraser.activate();
    });


    $('#postSchemaBtn').click(function () {
        postSchema();
        deleteProgress();
        window.location.replace(host+"/addRooms/"+placeId);
    });

    $('#nextStage').click(function () {
        currentStage++;
        figureOutStage();
        saveProgress();
    });
    $('#previousStage').click(function () {
        currentStage--;
        figureOutStage();
        cntctPointsGroup.remove();
        saveProgress();
    });

    $('#createRoomBtn').click(function () {
        window.app.roomAllocator.activate();
        roomPoits = [];

        cntctPointsGroup = new Group();
        for (let i = 0; i < group.children.length; i++) {

            if (i === 0) {
                for (let j = 0; j < 4; j++) {
                    cntctPointsGroup.addChild(new Path.Circle({
                        center: group.children[i].segments[j].point,
                        radius: 7,
                        fillColor: '#696969',
                        name: "contactPoint",
                    }));
                }
            }

            cntctPointsGroup.addChild(new Path.Circle({
                center: group.children[i].firstSegment.point,
                radius: 7,
                fillColor: '#696969',
                name: "contactPoint",
            }));

            cntctPointsGroup.addChild(new Path.Circle({
                center: group.children[i].lastSegment.point,
                radius: 7,
                fillColor: '#696969',
                name: "contactPoint",
            }));
        }
        cntctPointsGroup.bringToFront();
    });

    $('#doorBtn').click(function () {
       window.app.door.activate();
    });

    $('#windowBtn').click(function () {
        window.app.window.activate();
    });


});
