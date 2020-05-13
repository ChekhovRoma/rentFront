import './style.css'
import paper from 'paper'
import $ from 'jquery'
import 'popper.js'
import 'bootstrap'
// const file = require('fs');
// const savePath = require('path');

paper.install(window);
window.$ = window.jQuery = $;
window.onload = function () {
    paper.setup('canvas');
    let group = new Group(); // все path включая area
    let roomArray = new Group();
    let path = new Path(); // прямая рисуемая пользователем
    let isGoodPoint = false;
    let rectangle; // если обнаружено помещение объект будет тут
    let isRoom = false; // пользователь решил что будет сдавать true
    let isClosed = true;
    let groupRooms = new Group();
    let groupRoomHelpers = new Group();
    let mainNearestPoint = new Point();
    let roomCounter = 0; // счетчик помещений
    let rulersSmallPointX = 5;
    let rulersSmallPointY = 5;
    let SmallestPointX = 50;
    let SmallestPointY = 50;
    let BiggestPointX = 700;
    let BiggestPointY = 700;
    let xMeters;
    let yMeters;
    let area;

    if (localStorage.getItem('paths')) {
        xMeters = localStorage.getItem('width');
        yMeters = localStorage.getItem('height');
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
            let groupRoomsHelpersParent = new Group();
            groupRoomsParent.importSVG(localStorage.getItem('rooms'));
            groupRoomsHelpersParent.importSVG(localStorage.getItem('rooms-helpers'));
            groupRooms = groupRoomsParent.firstChild;
            groupRoomHelpers = groupRoomsHelpersParent.firstChild;
            roomCounter = groupRooms.children.length;
        }
    } else {
        let button = document.getElementById("button");
        button.onclick = function () {
            drawArea();
        };
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

        group.addChild(area);
        roomArray.addChild(area);
        console.log(area);

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
        var location = path.lastSegment.point;
        if (location.y > BiggestPointY) {
            path.lastSegment.point.y = BiggestPointY;
        } else if (location.y < SmallestPointY) {
            path.lastSegment.point.y = SmallestPointY;
        }
    } //отрезать лишнее если вертикальна€ лини€ вышла за пределы

    function findRectangle() {
        var centralLine = new Path(new Point(path.interiorPoint), new Point(path.interiorPoint.x, path.interiorPoint.y - 1000));
        centralLine = findShortestLineForCentral(centralLine);
        if (isTouchRoom(path)) {
            path.remove();
            return;
        }
        if (centralLine === 0) return;
        if (path.firstSegment.point.x > path.lastSegment.point.x) {
            var rightLine = new Path(new Point(centralLine.interiorPoint), new Point(path.lastSegment.point.x - 3, centralLine.interiorPoint.y));
            var leftLine = new Path(new Point(centralLine.interiorPoint), new Point(path.firstSegment.point.x + 3, centralLine.interiorPoint.y));
        } else {
            var rightLine = new Path(new Point(centralLine.interiorPoint), new Point(path.lastSegment.point.x + 3, centralLine.interiorPoint.y));
            var leftLine = new Path(new Point(centralLine.interiorPoint), new Point(path.firstSegment.point.x - 3, centralLine.interiorPoint.y));
        }
        rightLine = findShortestLine(centralLine, rightLine);
        leftLine = findShortestLine(centralLine, leftLine);
        if (rightLine !== 0 && leftLine !== 0) {
            rectangle = new Path.Rectangle(new Point(leftLine.firstSegment.point.x, centralLine.lastSegment.point.y + 1), new Point(rightLine.firstSegment.point.x - 2, centralLine.firstSegment.point.y + 1));
            rectangle.fillColor = 'yellow';
            rectangle.opacity = 0.5;
            rectangle.strokeColor = 'black';
            $('#addRoomModal').modal('show');
            rightLine.remove();
            leftLine.remove();
            centralLine.remove();
        }
    }

    function findShortestLineForCentral(line) {
        var intersectionsArray = [];
        var intersections;
        for (var i = 0; i < group.children.length - 1; i++) {
            intersections = line.getIntersections(group.children[i]);
            if (intersections.length !== 0) {
                intersectionsArray.push(intersections[0]);
            }
        }
        if (intersectionsArray.length !== 0) {
            var shortestLine = new Path(new Point(intersectionsArray[0].point), new Point(path.interiorPoint));
            var shortestLineIndex = 0;
            var currentLine;
            for (i = 1; i < intersectionsArray.length; i++) {
                currentLine = new Path(new Point(intersectionsArray[i].point), new Point(path.interiorPoint));
                if (shortestLine.length > currentLine.length) {
                    shortestLine = currentLine;
                    shortestLineIndex = i;
                }
            }
            return shortestLine;
        } else return 0;
    }

    function findShortestLine(centralLine, line) {
        var intersectionsArray = [];
        var intersections;
        for (var i = 0; i < group.children.length - 1; i++) {
            intersections = line.getIntersections(group.children[i]);
            if (intersections.length !== 0) {
                intersectionsArray.push(intersections[0]);
            }
        }
        if (intersectionsArray.length !== 0) {
            var shortestLine = new Path(new Point(intersectionsArray[0].point), new Point(centralLine.interiorPoint));
            var shortestLineIndex = 0;
            var currentLine;
            for (i = 1; i < intersectionsArray.length; i++) {
                currentLine = new Path(new Point(intersectionsArray[i].point), new Point(centralLine.interiorPoint));
                if (shortestLine.length > currentLine.length) {
                    shortestLine = currentLine;
                    shortestLineIndex = i;
                }
            }
            return shortestLine;
        } else return 0;
    }

    function showIntersections() {
        for (var i = 0; i < group.children.length - 1; i++) {
            var intersectPoint = path.getIntersections(group.children[i]);
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
        var textLength = new PointText(path.interiorPoint.x - 10, path.interiorPoint.y - 5);
        path.length < (BiggestPointX - SmallestPointX) ?
            textLength.content = rounded(((path.length) * getPxInMeter())) + ' м' :
            textLength.content = Math.round((BiggestPointX - SmallestPointX) * getPxInMeter()) + ' м'; // ?
        textLength.removeOnDrag();
        textLength.removeOnUp();
    } // показывать длину горизонтальной

    function showLengthVertical() {
        // console.log(path.length);
        var textLength = new PointText(path.interiorPoint.x + 5, path.interiorPoint.y);
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
                console.log('hi');
                return true;
            }
        }
        return false;
    }

    function getNearestPointCoord(event) {
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
        new Path.Circle({
            center: nearestPoint,
            radius: 5,
            fillColor: '#009dec'
        }).removeOnMove();
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
                groupRooms.bringToFront();
                group.bringToFront();
            },

            onMouseDrag: function (event) {
                path.lastSegment.point = event.point;
                let angle = path.lastSegment.point.subtract(path.firstSegment.point);
                path.lastSegment.point = path.firstSegment.point.add(getRoundedAngle(angle));
                showIntersections();
                if (path.firstCurve.isHorizontal()) {
                    showSameLengthHorizontalLines();
                    showLengthHorizontal();
                } else {
                    showSameLengthVerticalLines();
                    showLengthVertical();
                }
            },

            onMouseUp: function () {
                path.fullySelected = false;
                path.strokeColor = 'black';
                if (path.length < 20) {
                    path.remove();
                } else {
                    if (path.firstCurve.isHorizontal()) {
                        cutHorizontalLine();
                    } else cutVerticalLine();
                    let hitResult = group.hitTest(path.lastSegment.point);
                    if (hitResult) {
                        if (hitResult.type === 'stroke') {
                            isClosed = true;
                            path.closed = true;
                            // path.selected= true;
                            console.log(roomArray);
                            if (roomArray.includes(path)) {
                                console.log("да");
                            }
                            console.log(path);
                        }
                    } else {
                        isClosed = false;
                        path.closed = false;
                    }
                    finishPath();
                    group.addChild(path);
                }
                saveProgress();
            },

            onMouseMove: onMouseMove,
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
        rooms: new Tool()
    }

    function onMouseMove(event) {
        if (isClosed) {
            getNearestPointCoord(event);
        } else {
            new Path.Circle({
                center: group.lastChild.lastSegment.point,
                radius: 5,
                fillColor: '#009dec'
            }).removeOnMove();
        }
    }

    function saveProgress() {
        group.name = 'paths';
        localStorage.clear();
        let paths = group.exportSVG({asString: true});

        if (groupRooms.children.length) {
            let rooms = groupRooms.exportSVG({asString: true});
            let roomsHelpers = groupRoomHelpers.exportSVG({asString: true});
            localStorage.setItem('rooms', rooms);
            localStorage.setItem('rooms-helpers', roomsHelpers);
        }
        localStorage.setItem('paths', paths);
        localStorage.setItem('width', xMeters);
        localStorage.setItem('height', yMeters);
    }


    // EVENT HANDLING
    $('#deleteProgressBtn').click(function () {
        localStorage.removeItem('paths');
        localStorage.removeItem('width');
        localStorage.removeItem('height');
        localStorage.removeItem('rooms');
        localStorage.removeItem('rooms-helpers');
        location.reload();
    });

    $('#addRoomModal').on('hidden.bs.modal', function (e) {
        if (isRoom) {
            groupRooms.addChild(rectangle);
            groupRoomHelpers.addChild(new Path(rectangle.segments[1].point.add(3), rectangle.segments[3].point.subtract(3), new Point(rectangle.segments[3].point.x - 3, rectangle.segments[3].point.y)));
            groupRooms.lastChild.fillColor = 'green';
            groupRooms.lastChild.name = "room" + roomCounter;
            roomCounter++;
            saveProgress();
        } else {
            rectangle.remove();
        }
        isRoom = false;
    });

    $('#confirmNewRoom').click(function () {
        isRoom = true;
        $('#addRoomModal').modal('hide');
    });

    $('#test').click(function () {
        test();
        // console.log(paper.project.exportSVG({asString :true}));
        //     fetch("http://127.0.0.1:8000/test", {
        //         method: "POST",
        //         mode: "cors",
        //         credentials: "include"
        //     }).then(function (response) {
        //        // return response.json();
        //         console.log(response);
        //     });

        // $.post( "http://127.0.0.1:8000/test", function( data ) {
        //     console.log(data);
        // });


    })


    async function test() {
        {
            let fullSchema = paper.project.exportSVG({asString: true});
            let rooms = localStorage.getItem('rooms') ? localStorage.getItem('rooms') : "";
            let paths = localStorage.getItem('paths') ? localStorage.getItem('paths') : "";
            let width = localStorage.getItem('width');
            let height = localStorage.getItem('height');

            fetch("http://127.0.0.1:8000/test", {
                crossDomain:true,
                method: 'POST',
                mode:'cors',
                headers: {'Content-Type': 'application/json',
                    // 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },

                body: JSON.stringify({
                    'fullSchema': fullSchema,
                    'rooms': rooms,
                    'paths': paths,
                    'width': width,
                    'height': height,
                })
            })
                .then( response => response.json())
                .then(body => {
                   // const test = body.getReader();

                    console.log(body);
                })
        }
    }
}

// {
//     fetch("http://127.0.0.1:8000/test", {
//         crossDomain:true,
//         method: 'POST',
//         mode:'cors',
//         headers: {'Content-Type':'application/json'},
//     })
//         .then(async response => {
//             if (response.ok) {
//                 // console.log(response);
//                 this.apiError = false;
//                 console.log(response);
//                 this.result = await response.json();
//
//             } else {
//                 this.apiError = true;
//             }
//         })
//         .catch(() => (this.apiError = true));
// }
// }