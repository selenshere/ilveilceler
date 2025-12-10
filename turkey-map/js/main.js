// Gösterilecek iller (il grubunun id'si ne olursa olsun içinde bu kelimeler geçiyorsa)
var allowedProvinceTokens = [
  "AFYON",
  "BALIKESIR",
  "BILECIK",
  "BURSA",
  "CANAKKALE",
  "KUTAHYA",
  "YALOVA"
];

var currentZoom = 1.0;
var panX = 0;
var panY = 0;
var isDragging = false;
var dragStartX = 0;
var dragStartY = 0;
var startPanX = 0;
var startPanY = 0;

// Türkçe karakterleri sadeleştirip büyük harfe çevir
function normalizeId(str) {
  if (!str) return "";
  return str
    .toUpperCase()
    .replace(/İ/g, "I")
    .replace(/Ş/g, "S")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C");
}

// Zoom + pan uygula
function applyTransform() {
  var $svg = $("#turkey-map svg");
  if (!$svg.length) return;
  $svg.css(
    "transform",
    "translate(" + panX + "px," + panY + "px) scale(" + currentZoom + ")"
  );
}

// Sadece belirtilen illeri göster
function filterProvinces() {
  $("#turkey-map svg #turkey > g").each(function () {
    var id = this.id || "";
    var nid = normalizeId(id);
    var keep = allowedProvinceTokens.some(function (token) {
      return nid.indexOf(token) !== -1;
    });
    $(this).css("display", keep ? "" : "none");
  });
}

// SVG'yi yerleştir
function buildMap(svgText) {
  var $map = $("#turkey-map");
  $map.find(".map-container").remove();

  var $container = $('<div class="map-container"></div>');
  $container.html(svgText);
  $map.append($container);

  // Arka plan rengi
  var bg = $map.attr("data-bg-color");
  if (bg) $map.css("background-color", bg);

  // Sadece istenen illeri göster
  filterProvinces();

  // Zoom/pan reset
  currentZoom = 1.0;
  panX = 0;
  panY = 0;
  applyTransform();
}

// İlk haritayı yükle
function GetMap() {
  $.get("turkey-map/source/turkey-demo.svg", function (data) {
    buildMap(data);
  }, "text");
}

// Dinamik ilçe etiketleri
function buildLabels() {
  var svg = $("#turkey-map svg")[0];
  if (!svg) return;

  $("#turkey-map svg #turkey > g:visible > g").each(function () {
    var g = this;
    var $g = $(g);

    if ($g.find("text.district-label").length) return;

    var $city = $g.parent("g");
    var cityName = $city.attr("id") || "";
    var distName = $g.attr("id") || "";
    var labelText = distName || cityName;
    if (!labelText) return;

    try {
      var box = g.getBBox();
      var x = box.x + box.width / 2;
      var y = box.y + box.height / 2;

      var text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      text.setAttribute("class", "district-label");
      text.setAttribute("x", x);
      text.setAttribute("y", y);
      text.textContent = labelText;
      g.appendChild(text);
    } catch (e) {
      // getBBox bazen hata verebilir, atla
    }
  });
}

// Etiket fontu
function updateLabelSize() {
  var size = parseInt($("#labelSize").val() || "11", 10);
  $(".district-label").attr("font-size", size + "px");
  $("#labelSizeValue").text(size + "px");
}

$(function () {
  var $mapRoot = $("#turkey-map");
  $mapRoot.addClass("labels-hidden");

  GetMap();

  // İlçe üzerine gelince sol üstte il + ilçe adı
  $(document).on(
    "mouseenter",
    "#turkey-map svg #turkey > g > g",
    function () {
      var $d = $(this);
      var $city = $d.parent("g");
      var cityName = $city.attr("id") || "";
      var distName = $d.attr("id") || "";
      var text = "";
      if (cityName && distName) text = cityName + " - " + distName;
      else text = cityName || distName || "";
      $(".hover-info").text(text);
    }
  );

  $(document).on(
    "mouseleave",
    "#turkey-map svg #turkey > g > g",
    function () {
      // Üzerinden çıkınca yazıyı temizlemek istemezsen burayı boş bırakabilirsin
      // $(".hover-info").text("");
    }
  );

  // İlçeye tıklayınca renklendir
  $(document).on(
    "click",
    "#turkey-map svg #turkey > g > g",
    function () {
      var $district = $(this);
      var color = $("#colorPicker").val() || "#3EA1AA";
      $district.find("path, polygon").css("fill", color);
    }
  );

  // İsimleri göster/gizle
  $("#toggleLabels").on("click", function () {
    var $map = $("#turkey-map");
    if ($map.hasClass("labels-visible")) {
      $map.removeClass("labels-visible");
      $(this).text("İsimleri Göster");
    } else {
      buildLabels();
      updateLabelSize();
      $map.addClass("labels-visible");
      $(this).text("İsimleri Gizle");
    }
  });

  // Yazı boyutu slider
  $("#labelSize").on("input change", function () {
    updateLabelSize();
  });

  // İl sınırları göster/gizle
  $("#toggleBorders").on("click", function () {
    var $map = $("#turkey-map");
    if ($map.hasClass("borders-on")) {
      $map.removeClass("borders-on");
      $(this).text("İl Sınırlarını Göster");
    } else {
      $map.addClass("borders-on");
      $(this).text("İl Sınırlarını Gizle");
    }
  });

  // Zoom butonları
  $("#zoomIn").on("click", function () {
    currentZoom = Math.min(currentZoom + 0.2, 4);
    applyTransform();
  });

  $("#zoomOut").on("click", function () {
    currentZoom = Math.max(currentZoom - 0.2, 0.4);
    applyTransform();
  });

  $("#zoomReset").on("click", function () {
    currentZoom = 1.0;
    panX = 0;
    panY = 0;
    applyTransform();
  });

  // Mouse ile haritayı sürükleyerek gezme (pan)
  $(document).on("mousedown", "#turkey-map svg", function (e) {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    startPanX = panX;
    startPanY = panY;
    e.preventDefault();
  });

  $(document).on("mousemove", function (e) {
    if (!isDragging) return;
    var dx = e.clientX - dragStartX;
    var dy = e.clientY - dragStartY;
    panX = startPanX + dx;
    panY = startPanY + dy;
    applyTransform();
  });

  $(document).on("mouseup mouseleave", function () {
    isDragging = false;
  });

  // SVG kaydet
  $("#saveSvg").on("click", function () {
    var svgElem = $("#turkey-map svg")[0];
    if (!svgElem) return;

    var serializer = new XMLSerializer();
    var source = serializer.serializeToString(svgElem);
    if (!source.match(/^<\\?xml/)) {
      source = '<?xml version="1.0" standalone="no"?>\\r\\n' + source;
    }

    var blob = new Blob([source], {
      type: "image/svg+xml;charset=utf-8",
    });
    var url = URL.createObjectURL(blob);

    var a = document.createElement("a");
    a.href = url;
    a.download = "secili-iller-harita.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Kayıtlı SVG yükle
  $("#loadSvg").on("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var text = ev.target.result;
      buildMap(text);
      $("#turkey-map").removeClass("labels-visible");
      $("#toggleLabels").text("İsimleri Göster");
    };
    reader.readAsText(file);
  });
});
