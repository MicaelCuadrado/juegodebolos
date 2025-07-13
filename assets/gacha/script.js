

// Strict mode để đảm bảo code sạch hơn
(function () {
    'use strict'

    // =================================================================
    // CÀI ĐẶT BAN ĐẦU VÀ CÁC BIẾN TOÀN CỤC
    // =================================================================

    const MAX_TRAY_BALLS = 6 // Số lượng kẹo tối đa trong khay

    // Dữ liệu kẹo. Có thể được mở rộng từ nguồn khác.
    const language = window.dataGachaLoveLoom?.messages;
    const defaultCandy = { text: language.default_candy_text, image: '' }
    const candyTexts = [
        ...(window.dataGachaLoveLoom?.data?.candyTexts || [defaultCandy]),
    ]
    function formatMessage(messageString, replacements = {}) {
        let formatted = messageString;
        for (const key in replacements) {
            formatted = formatted.replace(`:${key}`, replacements[key]);
        }
        return formatted;
    }

    // Lấy các phần tử DOM
    const egg = document.querySelector('.egg')
    const eggColor = document.querySelector('.egg-color')
    const openEggColor = document.querySelector('.open-egg-color')
    const machine = document.querySelector('.machine')
    const winnerDisplay = document.querySelector('.winner')
    const mask = document.querySelector('.mask')
    const switchBtn = document.querySelector('.switch')
    const stickyContainer = document.querySelector('.sticky-notes-container')
    const quantityInput = document.getElementById('quantity-input');
    const increaseBtn = document.getElementById('increase-btn');
    const decreaseBtn = document.getElementById('decrease-btn');

    // Trạng thái game
    let ballsInMachine = []
    let isProcessing = false
    let currentWinnerBall = null // Quả trứng đang chờ được mở
    let hasWinner = false
    let trayBalls = [] // Kẹo đã mở và nằm trong khay
    let stickyNotes = [] // Các ghi chú dán trên màn hình
    let isErrorMessage = false;
    let animatingToTrayCount = 0;
    // Âm thanh
    const switchSound = new Audio('../love.tsonit.com/storage/musics/stwich_sound.mp3')
    switchSound.volume = 0.22
    const bgMusic = new Audio('../love.tsonit.com/assets/gacha/sounds/Background.mp3')
    bgMusic.loop = true
    bgMusic.volume = 0.3
    let bgMusicStarted = false
    const popSound = new Audio('../love.tsonit.com/storage/musics/pop.mp3')
    popSound.volume = 0.6
    // --- THÊM MỚI ---
    const revealSound = new Audio('../love.tsonit.com/storage/musics/pop.mp3'); // Tạo âm thanh mới
    revealSound.volume = 0.5;

    const gachaponContainer = document.querySelector('.gachapon'); // Lấy cả container lớn
    const topLight = document.querySelector('.machine > path[fill="#ed483e"]'); // Lấy đèn trên nóc
    // --- KẾT THÚC THÊM MỚI ---
    // =================================================================
    // LOGIC CHO GHI CHÚ (STICKY NOTES)
    // =================================================================

    let isDragging = false
    let dragElement = null
    let dragStartX = 0
    let dragStartY = 0
    let dragStartTime = 0
    let isFromStickyNote = false // Dùng để phân biệt click mở lại từ sticky note



    function createStickyNote(content, eggColorValue = null) {
        const note = document.createElement('div')
        note.className = 'sticky-note creating'
        note.innerHTML = `<span class="pin-icon">📍</span>${content}`

        if (eggColorValue) {
            note.setAttribute('data-egg-color', eggColorValue)
        }

        const position = calculateStickyPosition(stickyNotes.length)
        note.style.left = `${position.x}px`
        note.style.top = `${position.y}px`
        note.style.zIndex = (10 + stickyNotes.length).toString()

        const scale = window.innerWidth <= 768 ? 0.3 : 0.5
        note.style.setProperty('--note-scale', scale)

        note.addEventListener('mousedown', (event) => startDrag(event, note))
        note.addEventListener('touchstart', (event) => startDrag(event, note), {
            passive: false,
        })

        stickyContainer.appendChild(note)
        stickyNotes.push(note)

        setTimeout(() => {
            note.classList.remove('creating')
            note.classList.add('highlight')
            setTimeout(() => note.classList.remove('highlight'), 1000)
        }, 500)
    }

    function startDrag(event, element) {
        event.preventDefault()
        if (event.target.closest('.winner')) return

        isDragging = true
        dragElement = element
        element.classList.remove('shake-bottom')
        if (element['_shakeTimeout']) clearTimeout(element['_shakeTimeout'])

        const clientX = event.touches ? event.touches[0].clientX : event.clientX
        const clientY = event.touches ? event.touches[0].clientY : event.clientY

        dragStartX = clientX
        dragStartY = clientY
        dragStartTime = Date.now()

        element['_dragInitialLeft'] = parseFloat(element.style.left) || 0
        element['_dragInitialTop'] = parseFloat(element.style.top) || 0
        element['_dragStartClientX'] = clientX
        element['_dragStartClientY'] = clientY

        element.classList.add('dragging')
        element.style.zIndex = '1000'
    }

    function drag(event) {
        if (!isDragging || !dragElement) return
        event.preventDefault()

        const clientX = event.touches ? event.touches[0].clientX : event.clientX
        const clientY = event.touches ? event.touches[0].clientY : event.clientY
        const dx = clientX - dragElement['_dragStartClientX']
        const dy = clientY - dragElement['_dragStartClientY']

        dragElement.style.left = `${dragElement['_dragInitialLeft'] + dx}px`
        dragElement.style.top = `${dragElement['_dragInitialTop'] + dy}px`
    }

    function endDrag(event) {
        if (!isDragging || !dragElement) return;

        // Xác định xem đây là click hay kéo-thả
        const clientX = event.changedTouches ? event.changedTouches[0].clientX : event.clientX;
        const clientY = event.changedTouches ? event.changedTouches[0].clientY : event.clientY;
        const distance = Math.hypot(clientX - dragStartX, clientY - dragStartY);
        const duration = Date.now() - dragStartTime;
        const isClick = distance < 5 && duration < 200;

        isDragging = false;
        dragElement.classList.remove('dragging');

        // **LOGIC ĐÃ ĐƯỢC TÁCH BIỆT**

        if (isClick) {
            // --- NẾU LÀ CLICK ---
            // 1. Chỉ thực hiện logic hiển thị lại thông tin
            isFromStickyNote = true;
            const content = dragElement.innerHTML.replace(/<span class="pin-icon">.*?<\/span>/, '');
            winnerDisplay.innerHTML = content;

            const eggColor = dragElement.getAttribute('data-egg-color');
            if (eggColor && openEggColor) {
                openEggColor.setAttribute('fill', eggColor);
            }
            mask.classList.add('active');

            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            dragElement = null;
            return;

        } else {
            // --- NẾU LÀ KÉO-THẢ ---
            // 1. Ghi nhận vị trí mới do người dùng đặt
            dragElement.setAttribute('data-user-positioned', 'true');
            popSound.currentTime = 0;
            popSound.play();

            // 2. Tăng z-index để nó nổi lên trên
            const maxZIndex = Math.max(...stickyNotes.map(note => parseInt(note.style.zIndex) || 10));
            dragElement.style.zIndex = (maxZIndex + 1).toString();

            // 3. Chạy animation "thả"
            const scale = window.innerWidth <= 768 ? 0.3 : 0.5;
            dragElement.style.setProperty('--note-scale', scale);
            dragElement.classList.add('shake-bottom');

            // Xóa các thuộc tính kéo-thả
            const elementToClear = dragElement; // Lưu lại tham chiếu
            elementToClear['_shakeTimeout'] = setTimeout(() => {
                elementToClear.classList.remove('shake-bottom');
            }, 700);
        }

        // Reset các biến và style chung sau khi kết thúc kéo thả
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';

        if (dragElement) {
            delete dragElement['_dragInitialLeft'];
            delete dragElement['_dragInitialTop'];
            delete dragElement['_dragStartClientX'];
            delete dragElement['_dragStartClientY'];
        }

        dragElement = null;
    }

    function calculateStickyPosition(index) {
        const isMobile = window.innerWidth <= 768;
        const scale = isMobile ? 0.3 : 0.5;
        const noteWidth = 400 * scale;
        const noteHeight = 200 * scale;
        const gap = isMobile ? 15 : 12;
        const margin = 15;

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // --- BẮT ĐẦU SỬA LỖI ---
        // Tính toán nửa chiều rộng của máy gacha một cách linh động.
        // Trên mobile, nó bị scale còn 0.75 trong CSS, nên ta cũng nhân với 0.75 ở đây.
        const machineBaseHalfWidth = 206; // Nửa chiều rộng máy trên desktop
        const machineHalfWidth = isMobile ? (machineBaseHalfWidth * 0.75) : machineBaseHalfWidth;

        // Sử dụng giá trị linh động thay vì số cố định 206
        const machineZone = {
            left: screenWidth / 2 - machineHalfWidth,
            right: screenWidth / 2 + machineHalfWidth,
            top: 37,
            bottom: 450,
        };
        // --- KẾT THÚC SỬA LỖI ---

        // Vùng bên trái
        const leftZone = {
            x: margin,
            y: margin,
            width: machineZone.left - margin * 2,
            height: screenHeight - margin * 2,
        };
        // Vùng bên phải
        const rightZone = {
            x: machineZone.right + margin,
            y: margin,
            width: screenWidth - (machineZone.right + margin) - margin,
            height: screenHeight - margin * 2,
        };

        const notesPerColLeft = Math.floor(leftZone.height / (noteHeight + gap));
        if (index < notesPerColLeft && leftZone.width > noteWidth) {
            return { x: leftZone.x, y: leftZone.y + index * (noteHeight + gap) };
        }

        index -= notesPerColLeft;
        const notesPerColRight = Math.floor(rightZone.height / (noteHeight + gap));
        if (index < notesPerColRight && rightZone.width > noteWidth) {
            return { x: rightZone.x, y: rightZone.y + index * (noteHeight + gap) };
        }

        // Vị trí dự phòng nếu không đủ chỗ
        return { x: margin, y: margin + index * 5 };
    }

    function repositionAllStickyNotes() {
        stickyNotes.forEach((note, index) => {
            // --- BẮT ĐẦU SỬA LỖI ---
            // Nếu ghi chú này đang được kéo (isDragging) thì bỏ qua, không sắp xếp lại nó.
            if (isDragging && note === dragElement) {
                return;
            }
            // --- KẾT THÚC SỬA LỖI ---

            if (!note.hasAttribute('data-user-positioned')) {
                const pos = calculateStickyPosition(index);

                // Sử dụng lại logic bù trừ đã có để đảm bảo vị trí đúng
                const isMobile = window.innerWidth <= 768;
                const scale = isMobile ? 0.3 : 0.5;
                const noteBaseWidth = 400;
                const noteBaseHeight = 200;

                const offsetX = (noteBaseWidth * (1 - scale)) / 2;
                const offsetY = (noteBaseHeight * (1 - scale)) / 2;

                const adjustedX = pos.x - offsetX;
                const adjustedY = pos.y - offsetY;

                note.style.left = `${adjustedX}px`;
                note.style.top = `${adjustedY}px`;
            }
        });
    }

    // Gắn các event listener cho việc kéo thả
    document.addEventListener('mousemove', drag)
    document.addEventListener('mouseup', endDrag)
    document.addEventListener('touchmove', drag, { passive: false })
    document.addEventListener('touchend', endDrag)
    window.addEventListener('resize', repositionAllStickyNotes)
    // function triggerConfetti() {
    //     let confettiContainer = document.getElementById('confetti-container');
    //     if (!confettiContainer) {
    //         confettiContainer = document.createElement('div');
    //         confettiContainer.id = 'confetti-container';
    //         confettiContainer.className = 'confetti-container';
    //         document.body.appendChild(confettiContainer);
    //     }

    //     confettiContainer.innerHTML = ''; // Xóa pháo giấy cũ
    //     const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800'];

    //     for (let i = 0; i < 150; i++) {
    //         const piece = document.createElement('div');
    //         piece.className = 'confetti-piece';
    //         piece.style.left = `${Math.random() * 100}vw`;
    //         piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    //         piece.style.animationDelay = `${Math.random() * 0.5}s`;
    //         piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    //         confettiContainer.appendChild(piece);
    //     }

    //     setTimeout(() => {
    //         confettiContainer.innerHTML = '';
    //     }, 4000);
    // }
    // =================================================================
    // LOGIC VẬT LÝ VỚI MATTER.JS
    // =================================================================

    document.addEventListener('DOMContentLoaded', function () {
        const Engine = Matter.Engine,
            World = Matter.World,
            Bodies = Matter.Bodies,
            Body = Matter.Body

        const engine = Engine.create()
        const world = engine.world
        world.gravity.y = 1.1

        const centerX = 308.5
        const radius = 260
        const wallSegments = []

        // Tạo thành chứa hình tròn cho máy gacha
        const numSegments = 45
        const gapAngle = Math.PI / 8 // Góc mở ở dưới để kẹo rơi ra
        const bottomAngle = Math.PI / 2

        for (let i = 0; i < numSegments; i++) {
            const angle1 = (i / numSegments) * 2 * Math.PI
            const angle2 = ((i + 1) / numSegments) * 2 * Math.PI
            if (
                angle1 > bottomAngle - gapAngle / 2 &&
                angle1 < bottomAngle + gapAngle / 2
            )
                continue

            const x1 = centerX + radius * Math.cos(angle1)
            const y1 = 408.5 + 200 * Math.sin(angle1)
            const x2 = centerX + radius * Math.cos(angle2)
            const y2 = 408.5 + 200 * Math.sin(angle2)

            const segment = Bodies.rectangle(
                (x1 + x2) / 2,
                (y1 + y2) / 2,
                Math.hypot(x2 - x1, y2 - y1),
                16,
                {
                    isStatic: true,
                    angle: Math.atan2(y2 - y1, x2 - x1),
                    render: { visible: false },
                }
            )
            wallSegments.push(segment)
        }

        const floor = Bodies.rectangle(centerX, 600.5, radius * 1.7, 24, {
            isStatic: true,
            render: { visible: false },
        })
        World.add(world, [...wallSegments, floor])

        let physicsBalls = []
        const svgContainer = document.getElementById('balls-physics')

        // Khởi tạo các viên kẹo ban đầu
        function initializeCandies() {
            // Danh sách các màu đẹp, dễ nhìn với chữ trắng, được chọn để có độ tương phản tốt
            const pleasantColors = [
                '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F3A683',
                '#B4A7D6', '#574B90', '#F08080', '#9370DB', '#3CB371', '#FFA500',
                '#6A89CC', '#E57373', '#81C784', '#64B5F6', '#FFB74D', '#BA68C8',
                '#D81B60', '#F4511E', '#00897B', '#1E88E5', '#5E35B1'
            ];

            // ----- LOGIC MỚI: Xáo trộn danh sách màu để đảm bảo không trùng lặp -----
            // Sử dụng thuật toán Fisher-Yates để xáo trộn mảng một cách hiệu quả
            const shuffledColors = [...pleasantColors]; // Tạo một bản sao để không ảnh hưởng mảng gốc
            for (let i = shuffledColors.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledColors[i], shuffledColors[j]] = [shuffledColors[j], shuffledColors[i]];
            }
            // ---------------------------------------------------------------------

            ballsInMachine = candyTexts.map((candy, index) => {
                // Lấy màu từ danh sách đã xáo trộn một cách tuần tự.
                // Dùng toán tử modulo (%) để lặp lại danh sách màu nếu số kẹo nhiều hơn số màu có sẵn.
                const assignedColor = shuffledColors[index % shuffledColors.length];

                return {
                    color: {
                        main: assignedColor,
                        sub: 'white',
                    },
                    text: candy.text,
                    image: candy.image,
                    id: `candy-${Date.now()}-${index}`,
                };
            });
        }

        function createPhysicsBalls() {
            physicsBalls.forEach((ball) => World.remove(world, ball))
            physicsBalls = []

            ballsInMachine.forEach((candyData) => {
                const angle = Math.random() * 2 * Math.PI
                const spawnRadius = (radius - 64) * 0.7
                const x = centerX + spawnRadius * Math.cos(angle)
                const y = 268.5 + Math.random() * 40

                const ball = Bodies.circle(x, y, 32, {
                    restitution: 0.6,
                    friction: 0.05,
                    frictionAir: 0.01,
                    density: 0.002,
                })

                // Gắn dữ liệu vào quả bóng vật lý
                ball.customData = candyData
                physicsBalls.push(ball)
            })
            World.add(world, physicsBalls)
        }

        function renderSVG() {
            svgContainer.innerHTML = '' // Xóa các SVG cũ
            physicsBalls.forEach((ball) => {
                const { x, y } = ball.position
                const { main, sub } = ball.customData.color

                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
                const circle = document.createElementNS(
                    'http://www.w3.org/2000/svg',
                    'circle'
                )
                circle.setAttribute('cx', x)
                circle.setAttribute('cy', y)
                circle.setAttribute('r', 32)
                circle.setAttribute('fill', main)
                circle.setAttribute('stroke', '#57172F')
                circle.setAttribute('stroke-width', 10)

                const ellipse = document.createElementNS(
                    'http://www.w3.org/2000/svg',
                    'ellipse'
                )
                ellipse.setAttribute('cx', x - 8)
                ellipse.setAttribute('cy', y - 11.2)
                ellipse.setAttribute('rx', 16)
                ellipse.setAttribute('ry', 5.76)
                ellipse.setAttribute('fill', sub)
                ellipse.setAttribute('opacity', 0.7)

                g.appendChild(circle)
                g.appendChild(ellipse)
                svgContainer.appendChild(g)
            })
        }

        function spinMachine() {
            const originalGravity = world.gravity.y
            world.gravity.y = 0.4 // Giảm trọng lực để kẹo bay lên

            physicsBalls.forEach((ball) => {
                Body.setVelocity(ball, { x: 0, y: 0 })
                const dx = ball.position.x - centerX
                const dy = ball.position.y - 408.5
                const dist = Math.hypot(dx, dy)
                if (dist === 0) return

                // Áp dụng lực xoáy ban đầu
                const forceMagnitude = 0.25 + Math.random() * 0.15
                const force = {
                    x: (-dy / dist) * forceMagnitude,
                    y: (dx / dist) * forceMagnitude,
                }
                Body.applyForce(ball, ball.position, force)
            })

            setTimeout(() => {
                world.gravity.y = originalGravity // Khôi phục trọng lực
            }, 500)
        }

        function pickWinnerBalls(count) {
            const winners = [];
            if (ballsInMachine.length === 0) return winners;

            // Sắp xếp các quả bóng vật lý từ thấp đến cao
            const sortedPhysicsBalls = [...physicsBalls].sort((a, b) => b.position.y - a.position.y);

            for (let i = 0; i < count; i++) {
                if (ballsInMachine.length === 0) break;

                // Ưu tiên lấy những quả bóng thấp nhất trước
                const targetBall = sortedPhysicsBalls.length > i ? sortedPhysicsBalls[i] : null;

                let winnerData;
                if (targetBall) {
                    winnerData = targetBall.customData;
                } else {
                    // Nếu không đủ bóng vật lý, lấy ngẫu nhiên từ dữ liệu còn lại
                    winnerData = ballsInMachine[Math.floor(Math.random() * ballsInMachine.length)];
                }

                // Đảm bảo không chọn trùng lặp
                if (winners.some(w => w.id === winnerData.id)) {
                    i--; // Thử lại lần lặp này
                    continue;
                }

                winners.push(winnerData);

                // Xóa kẹo đã chọn khỏi các mảng quản lý
                ballsInMachine = ballsInMachine.filter(b => b.id !== winnerData.id);
                physicsBalls = physicsBalls.filter(p => {
                    if (p.customData.id === winnerData.id) {
                        World.remove(world, p);
                        return false;
                    }
                    return true;
                });
            }

            return winners;
        }

        function showEgg(winnerData) {
            eggColor.setAttribute('fill', winnerData.color.main)
            openEggColor.setAttribute('fill', winnerData.color.main)

            // --- THAY ĐỔI Ở ĐÂY ---
            egg.classList.add('active', 'egg-pop-in'); // Thêm class animation
            // Xóa class animation sau khi nó chạy xong để có thể dùng lại
            egg.addEventListener('animationend', () => {
                egg.classList.remove('egg-pop-in');
            }, { once: true });
            // --- KẾT THÚC THAY ĐỔI ---

            currentWinnerBall = winnerData
            hasWinner = true
        }

        function addBallToTray(winnerData) {
            // Nếu khay đầy, xóa viên kẹo cũ nhất khỏi mảng DỮ LIỆU
            if (trayBalls.length >= MAX_TRAY_BALLS) {
                trayBalls.shift();
            }
            trayBalls.push(winnerData);

            // Thay vì vẽ lại, chỉ gọi animation. Hàm renderTray sẽ được gọi sau.
            animateBallToTray(winnerData, trayBalls.length - 1, () => {
                // Sau khi animation bay xong, VẼ LẠI TOÀN BỘ KHAY để đảm bảo vị trí đúng
                renderTray();
            });
        }
        function renderTray() {
            const trayContainer = document.getElementById('tray-candies');
            trayContainer.innerHTML = ''; // Luôn xóa sạch trước khi vẽ lại

            trayBalls.forEach((ballData, index) => {
                const svgNamespace = 'http://www.w3.org/2000/svg';
                const g = document.createElementNS(svgNamespace, 'g');
                g.classList.add('tray-candy');
                g.setAttribute('data-candy-id', ballData.id);

                const x = 100 + index * 90; // Vị trí được tính lại dựa trên index mới
                const y = 1000;
                g.style.transform = `translate(${x}px, ${y}px)`;

                const { main, sub } = ballData.color;

                const circle = document.createElementNS(svgNamespace, 'circle');
                circle.setAttribute('cx', 0);
                circle.setAttribute('cy', 0);
                circle.setAttribute('r', 35);
                circle.setAttribute('fill', main);
                circle.setAttribute('stroke', '#57172F');
                circle.setAttribute('stroke-width', 8);

                const ellipse = document.createElementNS(svgNamespace, 'ellipse');
                ellipse.setAttribute('cx', -8.75);
                ellipse.setAttribute('cy', -12.25);
                ellipse.setAttribute('rx', 17.5);
                ellipse.setAttribute('ry', 6.3);
                ellipse.setAttribute('fill', sub);
                ellipse.setAttribute('opacity', 0.7);

                g.appendChild(circle);
                g.appendChild(ellipse);
                g.style.cursor = 'pointer';

                // Gắn sự kiện click
                g.addEventListener('click', () => {
                    winnerDisplay.innerHTML = `
                <div style="background-color: ${ballData.color.main}; padding: 20px; border-radius: 15px; color: white; font-weight: bold; display: flex; flex-direction: column; align-items: center; gap: 15px; text-align: center;">
                    ${ballData.image
                            ? `<img src="${ballData.image}" style="width: 256px; height: 256px; object-fit: contain;" alt="${ballData.text}" />`
                            : ''
                        }
                    <span style="font-size: 24px;">${ballData.text}</span>
                </div>`;

                    const openEgg = document.querySelector('.open-egg-color');
                    if (openEgg) {
                        openEgg.setAttribute('fill', ballData.color.main);
                    }
                    mask.classList.add('active');

                    // Xóa kẹo khỏi mảng dữ liệu
                    const ballIndex = trayBalls.findIndex(b => b.id === ballData.id);
                    if (ballIndex > -1) {
                        trayBalls.splice(ballIndex, 1);
                    }

                    // Vẽ lại toàn bộ khay để các viên kẹo dồn lên
                    renderTray();
                });

                g.addEventListener('mouseenter', () => g.classList.add('hover'));
                g.addEventListener('mouseleave', () => g.classList.remove('hover'));

                trayContainer.appendChild(g);
            });
        }

        function animateBallToTray(candyData, trayIndex, onComplete) {
            animatingToTrayCount++; // Tăng biến đếm khi bắt đầu animation

            const svgNamespace = 'http://www.w3.org/2000/svg';
            const machineSvg = document.querySelector('.machine');

            const g = document.createElementNS(svgNamespace, 'g');
            g.classList.add('moving-candy');

            const circle = document.createElementNS(svgNamespace, 'circle');
            circle.setAttribute('cx', 313.5);
            circle.setAttribute('cy', 885.5);
            circle.setAttribute('r', 40.5);
            circle.setAttribute('fill', candyData.color.main);
            circle.setAttribute('stroke', '#57172F');
            circle.setAttribute('stroke-width', 10);
            g.appendChild(circle);

            const ellipse = document.createElementNS(svgNamespace, 'ellipse');
            ellipse.setAttribute('cx', 303.375);
            ellipse.setAttribute('cy', 871.825);
            ellipse.setAttribute('rx', 20.25);
            ellipse.setAttribute('ry', 7.29);
            ellipse.setAttribute('fill', candyData.color.sub);
            ellipse.setAttribute('opacity', 0.7);
            g.appendChild(ellipse);

            machineSvg.appendChild(g);

            // Tính toán vị trí đích
            const targetX = 100 + trayIndex * 90;
            const targetY = 1000;

            // Đặt biến CSS cho animation
            g.style.setProperty('--target-x', `${targetX - 313.5}px`);
            g.style.setProperty('--target-y', `${targetY - 885.5}px`);

            const animationEndCallback = () => {
                animatingToTrayCount--; // Giảm biến đếm khi animation kết thúc
                machineSvg.removeChild(g);
                if (onComplete) {
                    onComplete();
                }
                g.removeEventListener('animationend', animationEndCallback);
            };

            g.addEventListener('animationend', animationEndCallback);
        }

        function gameLoop() {
            Engine.update(engine)
            renderSVG()
            requestAnimationFrame(gameLoop)
        }

        // =================================================================
        // CÁC EVENT LISTENER CHÍNH CỦA GAME
        // =================================================================

        switchBtn.addEventListener('click', function () {
            if (isProcessing) return;

            const quantity = parseInt(quantityInput.value, 10);
            if (isNaN(quantity) || quantity < 1) return;

            // GỌI HÀM PLAY CỦA MANAGER
            if (window.musicManager) {
                window.musicManager.play();
            } else {
                console.error("musicManager chưa được khởi tạo!");
            }

            // --- BẮT ĐẦU KHỐI LOGIC KIỂM TRA ĐÃ SỬA LỖI ---
            // Logic này giải quyết lỗi "bấm nhanh" bằng cách tính cả những viên kẹo đang bay (`animatingToTrayCount`)

            // 1. Kiểm tra xem máy còn đủ kẹo không
            if (ballsInMachine.length < quantity) {
                isErrorMessage = true;
                winnerDisplay.innerHTML = `<div class="candy-popup" style="background-color: #FF6B6B"><span>${formatMessage(language.error_not_enough_candy, { count: ballsInMachine.length })}</span></div>`;
                mask.classList.add('active');
                return;
            }

            // 2. Tính toán chính xác số chỗ trống còn lại trong khay
            // Chỗ trống = Tối đa - (Số kẹo đã ở trong khay) - (Số kẹo đang bay tới)
            let availableTraySpace = MAX_TRAY_BALLS - trayBalls.length - animatingToTrayCount;

            // 3. Xử lý trường hợp đặc biệt: Nếu có quả trứng đang chờ, nó sẽ chiếm 1 chỗ
            // ngay khi lần quay mới bắt đầu. Vì vậy, ta phải trừ nó khỏi số chỗ trống có sẵn.
            if (hasWinner && currentWinnerBall) {
                availableTraySpace--;
            }

            // 4. So sánh số lượng muốn quay với số chỗ trống thực tế.
            // Đây là điều kiện kiểm tra duy nhất, áp dụng cho mọi trường hợp.
            if (quantity > availableTraySpace) {
                isErrorMessage = true;
                // Tạo thông báo lỗi thông minh hơn cho người dùng
                let errorMessage = language.error_tray_not_enough_space_general;
                if (availableTraySpace <= 0) {
                    errorMessage = language.error_tray_full;
                } else {
                    errorMessage = formatMessage(language.error_tray_not_enough_space, { count: availableTraySpace });
                }
                winnerDisplay.innerHTML = `<div class="candy-popup" style="background-color: #FF6B6B"><span>${errorMessage}</span></div>`;
                mask.classList.add('active');
                return;
            }
            // --- KẾT THÚC KHỐI LOGIC KIỂM TRA ---


            // ---- BẮT ĐẦU XỬ LÝ QUAY ----
            isProcessing = true;
            gachaponContainer.classList.add('machine-shake');
            setTimeout(() => gachaponContainer.classList.remove('machine-shake'), 500);
            switchSound.currentTime = 0;
            switchSound.play();
            this.classList.add('active');
            setTimeout(() => this.classList.remove('active'), 600);

            // Nếu có trứng đang chờ, di chuyển nó vào khay trước
            if (hasWinner && currentWinnerBall) {
                const ballToMoveToTray = currentWinnerBall;
                egg.classList.remove('active');

                // Vị trí đích của quả trứng này là tổng số kẹo đang có và đang bay tới
                const targetTrayIndexForEgg = trayBalls.length + animatingToTrayCount;
                animateBallToTray(ballToMoveToTray, targetTrayIndexForEgg, () => {
                    // Sau khi animation xong, mới cập nhật mảng dữ liệu và render lại
                    if (trayBalls.length >= MAX_TRAY_BALLS) trayBalls.shift();
                    trayBalls.push(ballToMoveToTray);
                    renderTray();
                });
                currentWinnerBall = null;
                hasWinner = false;
            }

            spinMachine();

            setTimeout(() => {
                // Trường hợp quay 1 viên: chỉ cần hiện trứng
                if (quantity === 1) {
                    const newWinner = pickWinnerBalls(1)[0];
                    if (newWinner) {
                        showEgg(newWinner);
                    }
                    isProcessing = false;
                } else {
                    // Trường hợp quay nhiều viên: cho bay thẳng vào khay
                    const winners = pickWinnerBalls(quantity);
                    if (winners.length > 0) {
                        winners.forEach((winner, index) => {
                            // Delay giữa các lần ra kẹo cho đẹp mắt
                            setTimeout(() => {
                                // TÍNH TOÁN VỊ TRÍ ĐÍCH CHÍNH XÁC
                                // Vị trí đích = (số kẹo đã nằm im) + (số kẹo đang bay)
                                // Vì các lần gọi được delay, `animatingToTrayCount` đã được cập nhật từ lần trước.
                                const targetTrayIndex = trayBalls.length + animatingToTrayCount;

                                animateBallToTray(winner, targetTrayIndex, () => {
                                    // Callback này chạy KHI VIÊN KẸO ĐÃ BAY TỚI NƠI
                                    if (trayBalls.length >= MAX_TRAY_BALLS) {
                                        trayBalls.shift();
                                    }
                                    trayBalls.push(winner);
                                    renderTray(); // Vẽ lại toàn bộ khay để đảm bảo vị trí đúng

                                    // Khi viên kẹo cuối cùng đã bay xong, cho phép quay tiếp
                                    if (index === winners.length - 1) {
                                        isProcessing = false;
                                    }
                                });
                                revealSound.play(); // Âm thanh cho mỗi viên kẹo
                            }, index * 400); // Delay 400ms giữa mỗi viên
                        });
                    } else {
                        isProcessing = false; // Không có kẹo nào được chọn
                    }
                }
            }, 1500); // Chờ máy quay xong
        });


        egg.addEventListener('click', function () {
            if (!currentWinnerBall) return

            revealSound.play();  // Chơi âm thanh chiến thắng
            isFromStickyNote = false
            winnerDisplay.innerHTML = `
        <div style="background-color: ${currentWinnerBall.color.main
                }; padding: 30px 20px 20px 20px; border-radius: 15px; color: white; font-weight: bold; display: flex; flex-direction: column; align-items: center; gap: 15px; text-align: center;">
           ${currentWinnerBall.image
                    ? `<img src="${currentWinnerBall.image}" style="width: 256px; height: 256px; object-fit: contain;" alt="${currentWinnerBall.text}" />`
                    : ''
                }
           <span style="font-size: 24px;">${currentWinnerBall.text}</span>
        </div>`
            mask.classList.add('active')

            this.classList.remove('active')
            currentWinnerBall = null
            hasWinner = false
        })

        mask.addEventListener('click', function (event) {
            if (event.target === this) {
                // Kiểm tra xem có phải là thông báo lỗi không
                if (isErrorMessage) {
                    isErrorMessage = false; // Reset cờ
                    this.classList.remove('active');
                    return; // Dừng lại, không làm gì thêm
                }

                // Chỉ lưu vào sticky note nếu đây là lần mở đầu tiên (không phải mở lại từ sticky note)
                if (!isFromStickyNote && winnerDisplay.innerHTML.trim()) {
                    const eggColor = openEggColor.getAttribute('fill');
                    createStickyNote(winnerDisplay.innerHTML, eggColor);
                }

                isFromStickyNote = false;
                this.classList.remove('active');
            }
        });

        // Khởi động game
        initializeCandies()
        createPhysicsBalls()
        gameLoop()
        if (topLight) {
            topLight.classList.add('light-pulse');
        }
        const quantityInput = document.getElementById('quantity-input');
        const increaseBtn = document.getElementById('increase-btn');
        const decreaseBtn = document.getElementById('decrease-btn');

        increaseBtn.addEventListener('click', () => {
            // Sửa radix từ 6 thành 10
            let currentValue = parseInt(quantityInput.value, 10);
            if (currentValue < 6) { // Giới hạn tối đa là 6
                quantityInput.value = currentValue + 1;
            }
        });

        decreaseBtn.addEventListener('click', () => {
            // Sửa radix từ 6 thành 10
            let currentValue = parseInt(quantityInput.value, 10);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
        });

        quantityInput.addEventListener('change', () => {
            // Sửa radix từ 6 thành 10
            let value = parseInt(quantityInput.value, 10);
            if (isNaN(value) || value < 1) {
                quantityInput.value = 1;
            }
            if (value > 6) { // Giới hạn tối đa
                quantityInput.value = 6;
            }
        });
    })
})()