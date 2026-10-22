import React, { useRef, useMemo, useCallback, useImperativeHandle } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';
import type {
  Coordinate,
  Destination,
  SearchArea,
  AlternativeDestination,
} from '../types';

export interface LeafletMapViewProps {
  style?: StyleProp<ViewStyle>;
  origin?: Coordinate & { name?: string };
  destination?: Coordinate & { name?: string };
  stops?: Destination[];
  polylineCoords?: Coordinate[];
  searchAreas?: SearchArea[];
  alternatives?: AlternativeDestination[];
  selectedCoord?: Coordinate;
  isPickerMode?: boolean;
  onCoordSelected?: (coord: Coordinate) => void;
  onAlternativePress?: (gem: AlternativeDestination) => void;
}

export interface LeafletMapViewHandle {
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

const LeafletMapView = React.forwardRef<LeafletMapViewHandle, LeafletMapViewProps>(
  (
    {
      style,
      origin,
      destination,
      stops,
      polylineCoords,
      searchAreas,
      alternatives,
      selectedCoord,
      isPickerMode = false,
      onCoordSelected,
      onAlternativePress,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      resetView: () => {
        webViewRef.current?.injectJavaScript(`
          if (typeof window.fitRouteBounds === 'function') {
            window.fitRouteBounds();
          }
          true;
        `);
      },
      zoomIn: () => {
        webViewRef.current?.injectJavaScript(`
          if (window.map) { window.map.zoomIn(); }
          true;
        `);
      },
      zoomOut: () => {
        webViewRef.current?.injectJavaScript(`
          if (window.map) { window.map.zoomOut(); }
          true;
        `);
      },
    }));

    // HTML & JS Leaflet Map Template (Retina / High-DPI Enabled)
    const htmlContent = useMemo(() => {
      const originJson = origin ? JSON.stringify(origin) : 'null';
      const destJson = destination ? JSON.stringify(destination) : 'null';
      const stopsJson = stops && stops.length > 0 ? JSON.stringify(stops) : '[]';
      const polylineJson =
        polylineCoords && polylineCoords.length > 0
          ? JSON.stringify(polylineCoords.map((c) => [c.lat, c.lng]))
          : '[]';
      const areasJson = searchAreas && searchAreas.length > 0 ? JSON.stringify(searchAreas) : '[]';
      const altsJson = alternatives && alternatives.length > 0 ? JSON.stringify(alternatives) : '[]';
      const selectedJson = selectedCoord ? JSON.stringify(selectedCoord) : 'null';

      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: #E6EFEC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      touch-action: pan-x pan-y pinch-zoom;
    }
    img.leaflet-tile {
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
    .custom-icon {
      background: none;
      border: none;
    }
    .marker-pin {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      color: #FFFFFF;
      font-weight: 700;
      border: 2px solid #FFFFFF;
      box-shadow: 0 3px 6px rgba(0,0,0,0.35);
    }
    .origin-marker {
      background: #2563EB;
      width: 30px;
      height: 30px;
      font-size: 13px;
    }
    .stop-marker {
      background: #1B6B66;
      width: 28px;
      height: 28px;
      font-size: 12px;
    }
    .dest-marker {
      background: #DC2626;
      width: 30px;
      height: 30px;
      font-size: 13px;
    }
    .gem-marker {
      background: #F4B41A;
      color: #0E2A2B;
      width: 24px;
      height: 24px;
      font-size: 11px;
      border: 1.5px solid #0E2A2B;
    }
    .picker-marker {
      background: #2563EB;
      width: 34px;
      height: 34px;
      font-size: 16px;
      border: 3px solid #FFFFFF;
      box-shadow: 0 4px 8px rgba(0,0,0,0.4);
    }
    .leaflet-popup-content-wrapper {
      border-radius: 10px;
      padding: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .popup-title {
      font-weight: 700;
      font-size: 13px;
      color: #0E2A2B;
      margin-bottom: 2px;
    }
    .popup-desc {
      font-size: 11px;
      color: #64748B;
    }
    .leaflet-control-zoom {
      border: none !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.28) !important;
      border-radius: 8px !important;
      overflow: hidden;
      margin-bottom: 12px !important;
      margin-right: 12px !important;
    }
    .leaflet-control-zoom a {
      width: 34px !important;
      height: 34px !important;
      line-height: 34px !important;
      color: #0E2A2B !important;
      font-size: 17px !important;
      font-weight: 700 !important;
      background: #FFFFFF !important;
      border-bottom: 1px solid #E2E8F0 !important;
    }
    .leaflet-control-zoom a:last-child {
      border-bottom: none !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([-8.55, 115.2], 10);
    window.map = map;

    // Zoom control diposisikan di kanan bawah agar mudah dijangkau jempol
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // ── Tile Layer: Esri World Street Map (Sama persis dengan web Streamlit Lokayana) ──
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        detectRetina: true,
        attribution: 'Tiles &copy; Esri'
      }
    ).addTo(map);

    var isPicker = ${isPickerMode ? 'true' : 'false'};
    var origin = ${originJson};
    var destination = ${destJson};
    var stops = ${stopsJson};
    var polylineCoords = ${polylineJson};
    var searchAreas = ${areasJson};
    var alternatives = ${altsJson};
    var selectedCoord = ${selectedJson};

    var allLatLngs = [];

    // ── Mode Picker (Pilih Titik di Peta) ──
    if (isPicker && selectedCoord) {
      var pickerIcon = L.divIcon({
        className: 'custom-icon',
        html: '<div class="marker-pin picker-marker">📍</div>',
        iconSize: [34, 34],
        iconAnchor: [17, 34]
      });

      var pickerMarker = L.marker([selectedCoord.lat, selectedCoord.lng], {
        icon: pickerIcon,
        draggable: true
      }).addTo(map);

      map.setView([selectedCoord.lat, selectedCoord.lng], 12);

      map.on('click', function(e) {
        pickerMarker.setLatLng(e.latlng);
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'COORD_SELECTED',
          lat: e.latlng.lat,
          lng: e.latlng.lng
        }));
      });

      pickerMarker.on('dragend', function(e) {
        var pos = pickerMarker.getLatLng();
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'COORD_SELECTED',
          lat: pos.lat,
          lng: pos.lng
        }));
      });
    }

    // ── Polyline Rute OSRM ──
    if (polylineCoords && polylineCoords.length > 0) {
      var poly = L.polyline(polylineCoords, {
        color: '#1B6B66',
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round'
      }).addTo(map);
      polylineCoords.forEach(function(pt) { allLatLngs.push(pt); });
    }

    // ── Lingkaran Radius 15 km ──
    if (searchAreas && searchAreas.length > 0) {
      searchAreas.forEach(function(area) {
        var isOrigin = area.label === 'ORIGIN';
        var strokeColor = isOrigin ? '#2563EB' : '#1B6B66';
        var fillColor = isOrigin ? '#3B82F6' : '#1B6B66';

        L.circle([area.latitude, area.longitude], {
          radius: (area.radiusKm || 15) * 1000,
          color: strokeColor,
          fillColor: fillColor,
          fillOpacity: 0.12,
          weight: 2
        }).addTo(map);
      });
    }

    // ── Marker Titik Awal ──
    if (origin && !isPicker) {
      var originIcon = L.divIcon({
        className: 'custom-icon',
        html: '<div class="marker-pin origin-marker">🏠</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      L.marker([origin.lat, origin.lng], { icon: originIcon })
        .bindPopup('<div class="popup-title">Titik Awal</div><div class="popup-desc">' + (origin.name || '') + '</div>')
        .addTo(map);
      allLatLngs.push([origin.lat, origin.lng]);
    }

    // ── Marker Destinasi Berurutan (Multi-stop) ──
    if (stops && stops.length > 0 && !isPicker) {
      stops.forEach(function(stop, idx) {
        var isLast = idx === stops.length - 1;
        var markerClass = isLast ? 'dest-marker' : 'stop-marker';
        var iconHtml = '<div class="marker-pin ' + markerClass + '">' + (idx + 1) + '</div>';

        var stopIcon = L.divIcon({
          className: 'custom-icon',
          html: iconHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        L.marker([stop.lat, stop.lng], { icon: stopIcon })
          .bindPopup('<div class="popup-title">Stop ' + (idx + 1) + ': ' + stop.name + '</div><div class="popup-desc">' + stop.category + ' • ' + stop.district + '</div>')
          .addTo(map);
        allLatLngs.push([stop.lat, stop.lng]);
      });
    } else if (destination && !isPicker) {
      var destIcon = L.divIcon({
        className: 'custom-icon',
        html: '<div class="marker-pin dest-marker">🏁</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      L.marker([destination.lat, destination.lng], { icon: destIcon })
        .bindPopup('<div class="popup-title">Destinasi Tujuan</div><div class="popup-desc">' + (destination.name || '') + '</div>')
        .addTo(map);
      allLatLngs.push([destination.lat, destination.lng]);
    }

    // ── Marker Alternatif Serupa ──
    if (alternatives && alternatives.length > 0 && !isPicker) {
      alternatives.forEach(function(gem) {
        var gemIcon = L.divIcon({
          className: 'custom-icon',
          html: '<div class="marker-pin gem-marker">✨</div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        var m = L.marker([gem.lat, gem.lng], { icon: gemIcon })
          .bindPopup('<div class="popup-title">' + gem.name + ' (' + gem.similarityScore + '% Serupa)</div><div class="popup-desc">' + gem.category + ' • ' + gem.district + '</div>')
          .addTo(map);

        m.on('click', function() {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ALTERNATIVE_CLICKED',
            id: gem.id
          }));
        });
      });
    }

    // ── Fit Bounds Cerdas (Mencegah over-zoom ke laut) ──
    window.fitRouteBounds = function() {
      if (allLatLngs.length > 1 && !isPicker) {
        var validCoords = allLatLngs.filter(function(pt) {
          return pt && !isNaN(pt[0]) && !isNaN(pt[1]) && Math.abs(pt[0]) <= 90 && Math.abs(pt[1]) <= 180;
        });
        if (validCoords.length > 1) {
          var bounds = L.latLngBounds(validCoords);
          if (bounds.isValid()) {
            map.fitBounds(bounds, {
              padding: [45, 45],
              maxZoom: 13, // Batasi zoom maksimal di level 13 agar selalu melihat daratan pulau Bali secara proporsional
              animate: true
            });
          }
        } else if (validCoords.length === 1) {
          map.setView(validCoords[0], 11);
        }
      } else if (allLatLngs.length === 1 && !isPicker) {
        map.setView(allLatLngs[0], 11);
      } else if (!isPicker) {
        map.setView([-8.55, 115.2], 10);
      }
    };
    window.fitRouteBounds();
  </script>
</body>
</html>
      `;
    }, [
      origin,
      destination,
      stops,
      polylineCoords,
      searchAreas,
      alternatives,
      selectedCoord,
      isPickerMode,
    ]);

    const handleMessage = useCallback(
      (event: { nativeEvent: { data: string } }) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'COORD_SELECTED' && onCoordSelected) {
            onCoordSelected({ lat: data.lat, lng: data.lng });
          } else if (data.type === 'ALTERNATIVE_CLICKED' && onAlternativePress && alternatives) {
            const match = alternatives.find((a) => a.id === data.id);
            if (match) {
              onAlternativePress(match);
            }
          }
        } catch (err) {
          console.warn('Leaflet message parse error:', err);
        }
      },
      [onCoordSelected, onAlternativePress, alternatives]
    );

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          nestedScrollEnabled={true}
          overScrollMode="never"
          scalesPageToFit={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={colors.sea} />
            </View>
          )}
          style={styles.webView}
        />
      </View>
    );
  }
);

export default LeafletMapView;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E6EFEC',
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6EFEC',
  },
});

