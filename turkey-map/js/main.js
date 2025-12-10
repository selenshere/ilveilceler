// Kullanılacak iller
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

/* SVG'yi container içine kur */
function buildMap(svgText) {
  var $container = $("#turkey-map");

  // Eski SVG'yi temizle
  $container.find("svg").remove();

  var $svg = $(svgText);
  if (!$svg.is("svg")) {
    $svg = $svg.filter("svg").first();
  }
  if (!$svg.length) return;

  $svg.attr("preserveAspectRatio", "xMidYMid meet");
  $svg.css({
    width: "100%",
    height: "100%"
  });

  var bg = $container.data("bg-color") || "#FFF5D0";
  $svg.css("background", bg);

  // Sadece belirtilen illeri bırak
  $svg.find("#turkey > g").each(function () {
    var id = (this.id || "").toUpperCase();
    var show = false;
    for (var i = 0; i < allowedProvinceTokens.length; i++) {
      if (id.indexOf(allowedProvinceTokens[i]) >= 0) {
        show = true;
        break;
      }
    }
    if (!show) {
      $(this).remove();
    }
  });

  // Orijinal fill kaydı
  $svg.find("#turkey > g > g").each(function () {
    var $g = $(this);
    var $shape = $g.find("polygon, path").first();
    var fill = $shape.attr("fill");
    if (typeof fill === "undefined") fill = "none";
    $g.attr("data-original-fill", fill);
    $g.attr("data-colored", "0");
  });

  // Etiketleri oluştur
  createDistrictLabels($svg);

  // SVG'yi ekle
  $container.append($svg);

  // Zoom/pan reset
  currentZoom = 1.0;
  panX = 0;
  panY = 0;
  applyTransform();
}

/* Etiket oluşturma */
function createDistrictLabels($svg) {
  var defaultSize = $("#labelSize").val() || 14;

  $svg.find("#turkey > g > g").each(function () {
    var g = this;
    var $g = $(g);
    var $shape = $g.find("polygon, path").first();
    if (!$shape.length) return;

    var bbox = $shape[0].getBBox();
    var cx = bbox.x + bbox.width / 2;
    var cy = bbox.y + bbox.height / 2;

    var labelText = $g.attr("id") || "";
    if (!labelText) {
      var $innerText = $g.find("text").first();
      if ($innerText.length) labelText = $innerText.text();
    }

    var textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textEl.setAttribute("x", cx);
    textEl.setAttribute("y", cy);
    textEl.setAttribute("class", "district-label");
    textEl.setAttribute("font-size", defaultSize);
    textEl.textContent = labelText;

    g.appendChild(textEl);
  });

  $("#labelSizeValue").text(defaultSize + "px");
}

/* Zoom/pan transformu */
function applyTransform() {
  var $svg = $("#turkey-map svg");
  if (!$svg.length) return;

  $svg.css({
    transform:
      "translate(" + panX + "px, " + panY + "px) scale(" + currentZoom + ")",
    "transform-origin": "50% 50%"
  });
}

/* SVG indir (projeyi tekrar açmak için) */
function downloadSvg() {
  var svgEl = $("#turkey-map svg")[0];
  if (!svgEl) return;

  var serializer = new XMLSerializer();
  var source = serializer.serializeToString(svgEl);

  if (!/^<\?xml/.test(source)) {
    source = '<?xml version="1.0" standalone="no"?>\n' + source;
  }

  var blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  var url = URL.createObjectURL(blob);

  var a = document.createElement("a");
  a.href = url;
  a.download = "harita.svg";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* PNG indir (resim olarak kaydet) */
function downloadPng() {
  var svgEl = $("#turkey-map svg")[0];
  if (!svgEl) return;

  var serializer = new XMLSerializer();
  var source = serializer.serializeToString(svgEl);

  var svgBlob = new Blob([source], {
    type: "image/svg+xml;charset=utf-8"
  });
  var url = URL.createObjectURL(svgBlob);

  var img = new Image();
  img.onload = function () {
    var vb = svgEl.viewBox.baseVal;
    var w = vb && vb.width ? vb.width : 2000;
    var h = vb && vb.height ? vb.height : 1000;

    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");

    var bg = $("#turkey-map").data("bg-color") || "#FFF5D0";
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);

    var pngUrl = canvas.toDataURL("image/png");
    var a = document.createElement("a");
    a.href = pngUrl;
    a.download = "harita.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  img.src = url;
}

$(function () {
  // İlk haritayı yükle
  $.get(
    "turkey-map/source/turkey-demo.svg",
    function (data) {
      var text =
        typeof data === "string"
          ? data
          : new XMLSerializer().serializeToString(data.documentElement);
      buildMap(text);
    },
    "text"
  );

  /* Hover info */
  $("#turkey-map").on("mousemove", "svg #turkey > g > g", function () {
    var $g = $(this);
    var province = $g.parent().attr("id") || "";
    var district = $g.attr("id") || "";
    $(".hover-info").text(province + " / " + district);
  });

  $("#turkey-map").on("mouseleave", "svg #turkey > g > g", function () {
    // İstersen burayı boş bırak, yazı kalır
    // $(".hover-info").text("");
  });

  /* Tıkla -> boya / tekrar tıkla -> eski haline dön */
  $("#turkey-map").on("click", "svg #turkey > g > g", function () {
    var $district = $(this);
    var $shape = $district.find("polygon, path").first();
    if (!$shape.length) return;

    var colored = $district.attr("data-colored") === "1";

    if (!colored) {
      // Boyanmamış -> boya
      if (!$district.attr("data-original-fill")) {
        var originalFill = $shape.attr("fill");
        if (typeof originalFill === "undefined") originalFill = "none";
        $district.attr("data-original-fill", originalFill);
      }
      var color = $("#colorPicker").val() || "#3EA1AA";
      $shape.attr("fill", color);
      $district.attr("data-colored", "1");
    } else {
      // Boyanmış -> eski hale dön
      var original = $district.attr("data-original-fill");
      if (typeof original === "undefined") original = "none";
      $shape.attr("fill", original);
      $district.attr("data-colored", "0");
    }
  });

  /* Yazı boyutu */
  $("#labelSize").on("input change", function () {
    var size = $(this).val();
    $("#labelSizeValue").text(size + "px");
    $("#turkey-map .district-label").attr("font-size", size);
  });

  /* Etiket göster/gizle */
  $("#toggleLabels").on("click", function () {
    $("#turkey-map").toggleClass("labels-visible");
    var visible = $("#turkey-map").hasClass("labels-visible");
    $(this).text(visible ? "İsimleri Gizle" : "İsimleri Göster");
  });

  /* Zoom butonları */
  $("#zoomIn").on("click", function () {
    currentZoom *= 1.2;
    if (currentZoom > 8) currentZoom = 8;
    applyTransform();
  });

  $("#zoomOut").on("click", function () {
    currentZoom /= 1.2;
    if (currentZoom < 0.4) currentZoom = 0.4;
    applyTransform();
  });

  $("#zoomReset").on("click", function () {
    currentZoom = 1.0;
    panX = 0;
    panY = 0;
    applyTransform();
  });

  /* Mouse ile sürükleyerek pan */
  $("#turkey-map").on("mousedown", "svg", function (e) {
    isDragging = true;
    dragStartX = e.clientX - panX;
    dragStartY = e.clientY - panY;
    e.preventDefault();
  });

  $(document).on("mousemove", function (e) {
    if (!isDragging) return;
    panX = e.clientX - dragStartX;
    panY = e.clientY - dragStartY;
    applyTransform();
  });

  $(document).on("mouseup mouseleave", function () {
    isDragging = false;
  });

  /* Dosyayı kaydet (SVG) */
  $("#saveWork").on("click", function () {
    downloadSvg();
  });

  /* Resim olarak kaydet (PNG) */
  $("#savePng").on("click", function () {
    downloadPng();
  });

  /* Kayıtlı SVG yükle */
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
