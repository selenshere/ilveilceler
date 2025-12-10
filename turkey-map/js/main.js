var currentZoom = 1;
var panX = 0;
var panY = 0;
var isDragging = false;
var dragStartX = 0;
var dragStartY = 0;

/* SVG yükle */
$(function () {
  $.get("turkey-map/source/turkey-demo.svg", function (svg) {
    $("#turkey-map").append(svg);
  }, "text");
});

/* Hover il/ilçe bilgisi */
$(document).on("mousemove", "#turkey-map svg #turkey > g > g", function () {
  var p = $(this).parent().attr("id");
  var d = $(this).attr("id");
  $(".hover-info").text(p + " / " + d);
});

/* Tıkla → boya, tekrar tıkla → eski haline dön */
$(document).on("click", "#turkey-map svg #turkey > g > g", function () {
  var $g = $(this);
  var $shape = $g.find("path, polygon");
  if (!$shape.length) return;

  var colored = $g.attr("data-colored") === "1";

  if (!colored) {
    var color = $("#colorPicker").val();

    $shape.each(function () {
      var $s = $(this);

      if (!$s.attr("data-original-fill")) {
        $s.attr("data-original-fill", $s.css("fill"));
      }
      $s.css("fill", color);
    });

    $g.attr("data-colored", "1");
  } else {
    $shape.each(function () {
      var $s = $(this);
      var original = $s.attr("data-original-fill");
      $s.css("fill", original);
    });

    $g.attr("data-colored", "0");
  }
});

/* Etiket boyutu */
$("#labelSize").on("input", function () {
  var size = $(this).val();
  $("#labelSizeValue").text(size + "px");
  $(".district-label").attr("font-size", size);
});

/* Etiket göster */
$("#toggleLabels").on("click", function () {
  $("#turkey-map").toggleClass("labels-visible");
});

/* SVG kaydet */
$("#saveSvg").on("click", function () {
  var svg = $("#turkey-map svg")[0];
  var serializer = new XMLSerializer();
  var source = serializer.serializeToString(svg);

  var blob = new Blob([source], {
    type: "image/svg+xml;charset=utf-8"
  });
  var url = URL.createObjectURL(blob);

  var a = document.createElement("a");
  a.href = url;
  a.download = "harita.svg";
  a.click();
  URL.revokeObjectURL(url);
});

/* PNG kaydet */
$("#savePng").on("click", function () {
  var svg = $("#turkey-map svg")[0];
  var serializer = new XMLSerializer();
  var source = serializer.serializeToString(svg);

  var blob = new Blob([source], { type: "image/svg+xml" });
  var url = URL.createObjectURL(blob);

  var img = new Image();
  img.onload = function () {
    var canvas = document.createElement("canvas");
    canvas.width = svg.viewBox.baseVal.width;
    canvas.height = svg.viewBox.baseVal.height;

    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    var pngUrl = canvas.toDataURL("image/png");

    var a = document.createElement("a");
    a.href = pngUrl;
    a.download = "harita.png";
    a.click();
  };

  img.src = url;
});

/* SVG yükle */
$("#loadSvg").on("change", function (e) {
  var file = e.target.files[0];
  var reader = new FileReader();

  reader.onload = function (ev) {
    $("#turkey-map svg").remove();
    $("#turkey-map").append(ev.target.result);
  };

  reader.readAsText(file);
});
