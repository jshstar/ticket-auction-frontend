function getReservationList(token, page) {
    $.ajax({
        type: "GET",
        url: `${getUrl()}/api/v1/reservations`,
        data: {
            page: page,
            size: 15
        },
        headers: {
            "Authorization": token
        },
        success: function (response) {
            let data = response.data;

            $(".list-tb-body").empty();
            $(".pagination").empty();


            if (response.code === "R00002" && data.content) {
                displayReservation(data);
            }
        },
        fail: function (jqXHR, textStatus) {
            errorAlert("예매 목록 조회에 오류가 발생했습니다.");
        },
    });
}

function displayReservation(data) {
    let size = data.pageable.pageSize;
    let curIndex = data.number;

    for (let i = 0; i < data.content.length; i++) {
        let ei = encode(data.content[i].reservationId);
        let id = $('<td>').text(ei);
        var dateObject = formatDateTime(new Date(data.content[i].reservationDate));
        let date = $('<td>').text(dateObject);
        let title = $('<td>').text(data.content[i].title.split(" - ")[0]);
        let useDate = $('<td>').text(`${data.content[i].useDate}\n${data.content[i].numberOfTicket}매`);
        let cancelDate = $('<td>').text(data.content[i].cancelDeadline);
        let status = $('<td>');
        if (data.content[i].status === "OK") {
            status.text("예매");
        } else if (data.content[i].status === "CANCEL") {
            status.text("취소");
        } else {
            status.text("사용 완료");
        }

        let btn = $('<button>').addClass("detail-btn btn").text("상세")
            .on("click", function () {
                redirectToPageWithParameter(
                    "/reservation/reservation-detail.html",
                    "reservationId",
                    ei
                );
            });

        var now = new Date();
        let cancelBtn = $('<button>').addClass("btn-danger btn").text("취소")
            .on("click", function () {
                if (now > new Date(data.content[i].cancelDeadline)) {
                    errorAlert("취소 가능한 날짜가 지났습니다.");
                    return;
                }
                cancelReservation(ei);
            });

        let tr = $('<tr>').append(id)
            .append(date)
            .append(title)
            .append(useDate)
            .append(cancelDate)
            .append(status);


        if (data.content[i].status === "OK") {
            if (now <= new Date(data.content[i].cancelDeadline)) {
                tr.append($('<td>').append($('<div>').addClass("d-flex justify-content-center").append(btn).append(cancelBtn)));
            } else {
                tr.append($('<td>').append($('<div>').append(btn)));
            }
        } else {
            tr.append($('<td>'));
        }

        $(".list-tb-body").append(tr);
    }

    let totalPage = data.totalPages;
    let currentPage = data.number + 1; // 현재 페이지는 0부터 시작하는데, 표시는 1부터 시작하므로 +1

    const displayRange = 3; // 현재 페이지를 중심으로 보여질 페이지 범위

    let startPage = Math.max(1, currentPage - displayRange); // 시작 페이지
    let endPage = Math.min(totalPage, currentPage + displayRange); // 끝 페이지

    for (let i = startPage; i <= endPage; i++) {
        const pageNumber = i;
        let link = $('<a>');
        link.addClass('list-a');
        link.attr('href', '#');
        link.text(pageNumber);

        if (i === currentPage) {
            link.addClass('now');
        }

        link.on("click", function () {
            reissueToken((token => {
                getReservationList(token, i - 1); // 페이지는 0부터 시작하므로 1을 빼줍니다.
            }));
        });

        $(".pagination").append(link);
    }

// '<' 표시
    if (startPage > 1) {
        let prevLink = $('<a>');
        prevLink.addClass('list-a');
        prevLink.attr('href', '#');
        prevLink.text('<');

        prevLink.on("click", function () {
            reissueToken((token => {
                getReservationList(token, startPage - displayRange - 2); // 이전 범위의 마지막 페이지로 이동
            }));
        });

        $(".pagination").prepend(prevLink);
    }

// '>' 표시
    if (endPage < totalPage) {
        let nextLink = $('<a>');
        nextLink.addClass('list-a');
        nextLink.attr('href', '#');
        nextLink.text('>');

        nextLink.on("click", function () {
            reissueToken((token => {
                getReservationList(token, endPage); // 다음 범위의 첫 페이지로 이동
            }));
        });

        $(".pagination").append(nextLink);
    }
}


function getReservationDetail() {
    let token = Cookies.get("Authorization");

    let queryParams = getQueryParams();

    if (queryParams["reservationId"]) {
        let id = decode(queryParams["reservationId"]);
        $.ajax({
            type: "GET",
            url: `${getUrl()}/api/v1/reservations/${id}`,
            headers: {
                "Authorization": token
            },
            success: function (response) {
                let data = response.data;

                $(".reserved-goods-title").text(data.title.split(" - ")[0]);
                $(".reservation-user").text(data.username);
                $(".reservation-id").text(encode(data.reservationId));
                $(".reservation-price").text(`${data.price.toLocaleString()}원`);
                $(".reservation-date").text(data.useDate);
                $(".reservation-place").text(data.address);

                let stext = "";
                let seats = data.seats;
                for (let i = 0; i < seats.length; i++) {
                    let z = seats[i].zone;
                    let n = seats[i].seatNumber;

                    stext += `${z} 구역 ${n} 번 좌석\n`;
                }
                $(".reservation-seat").text(stext);
                $(".reservation-qr").append($('<button>').text("QR 생성").addClass("detail-btn btn"))
                    .on("click", function () {
                        redirectToPageWithParameter(
                            "/reservation/qr.html",
                            "reservationId",
                            encode(data.reservationId)
                        );
                    });
            },
            error: function (jqXHR, textStatus) {
                errorAlert("예약 상세 조회에 오류가 발생했습니다.");
            }
        });
    }
}

function getQrCode() {

    let token = Cookies.get("Authorization");

    let queryParams = getQueryParams();
    if (queryParams["reservationId"]) {
        let id = decode(queryParams["reservationId"]);
        $.ajax({
            type: "POST",
            url: `${getUrl()}/api/v1/reservations/${id}/qrcode`,
            headers: {
                "Authorization": token
            },
            success: function (response) {
                let now = new Date();
                let endTime = new Date(now.getTime() + 60000);

                if (response.code === "R00004") {
                    $("#qr-code").empty();
                    $("#remaining-time-div")
                        .empty()
                        .append($('<div>').addClass("me-4").text("남은 시간"))
                        .append($('<div>').attr("id", "remaining-time"));

                    displayQrCode(response.data, endTime);
                }
            },
            error: function (jqXHR, textStatus) {
                errorAlert("QR 코드 생성에 오류가 발생했습니다.");
            }
        });
    }

}

function displayQrCode(data, endTime) {
    // 여기서 서버에서 받아온 Base64 인코딩된 QR 코드 이미지를 설정하세요.
    // QR 코드를 표시할 div 요소를 가져옵니다.
    // QR 코드 이미지를 생성하고 div에 추가합니다.
    $("#qr-code").append($('<img>').attr("src", `data:image/png;base64, ${data}`));
    displayRemainingTimeInQr(endTime);
}

function displayRemainingTimeInQr(endTime) {
    let now = new Date();
    let timeDiff = endTime - now;

    if (timeDiff <= 0) {
        $("#remaining-time-div").empty();
        $("#remaining-time-div").append(
            $('<button>').text("QR 코드 재발급").addClass("btn qr-btn")
                .on("click", function () {
                        getQrCode();
                    }
                )
        );
    } else {
        // 남은 시간을 초로 변환
        let secondsRemaining = Math.floor(timeDiff / 1000);

        // 분과 초 계산
        let minutes = Math.floor(secondsRemaining / 60);
        let seconds = secondsRemaining % 60;

        // 시간 표시를 위해 2자리로 포맷팅
        let formattedTime = `${padZero(minutes)}:${padZero(seconds)}`;

        // 화면에 남은 시간 표시
        $("#remaining-time").text(`  ${formattedTime}`);

        setTimeout(function () {
            displayRemainingTimeInQr(endTime);
        }, 1000);
    }
}

function cancelReservation(id) {
    var reservationId = decode(id);
    let token = Cookies.get("Authorization");

    confirmAlert("해당 예매를 취소하시겠습니까?")
        .then((result) => {
            if (result) {

                $.ajax({
                    type: "DELETE",
                    url: `${getUrl()}/api/v1/reservations/${reservationId}`,
                    headers: {
                        "Authorization": token
                    },
                    success: function () {
                        okAlert("해당 예매가 취소되었습니다.");
                        window.location.reload();
                    },
                    error: function () {
                        errorAlert("예매 취소 중 에러가 발생했습니다.");
                    },
                });
            }
        });
}

// 10 미만의 숫자에 0을 붙이는 함수
function padZero(number) {
    return number < 10 ? `0${number}` : number;
}
