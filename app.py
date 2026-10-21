"""Lokayana: Perencana rute wisata Bali (Streamlit)."""

from math import radians, sin, cos, sqrt, atan2

import folium
import pandas as pd
import requests
import streamlit as st
from streamlit_folium import st_folium

URL_DATASET = (
    "https://raw.githubusercontent.com/anggadwiyana/Lokayana/refs/heads/main/"
    "bali_tourist_destination.csv"
)
DEFAULT_LAT = -8.650
DEFAULT_LON = 115.216
MAX_DESTINASI = 10

OSRM_URL = "http://router.project-osrm.org/route/v1/driving"
OSRM_TIMEOUT = 30

TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
TILES_ATTR = "Esri"

st.set_page_config(page_title="Lokayana", page_icon="🌴", layout="wide")


@st.cache_data(show_spinner="Memuat data destinasi...")
def load_data():
    df = pd.read_csv(URL_DATASET)
    df.columns = df.columns.str.lower().str.strip()
    df = df.drop_duplicates(subset="nama_tempat_wisata").reset_index(drop=True)
    return df.dropna(subset=["nama_tempat_wisata", "latitude", "longitude"])


def haversine(lat1, lon1, lat2, lon2):
    """Jarak garis lurus antar dua koordinat (km)."""
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def rute_greedy(destinasi, start_lat, start_lon):
    """Nearest neighbour: selalu pilih destinasi terdekat yang belum dikunjungi."""
    sisa = destinasi.copy()
    rute = []
    lat, lon = start_lat, start_lon

    while not sisa.empty:
        sisa["jarak"] = sisa.apply(
            lambda r: haversine(lat, lon, r["latitude"], r["longitude"]), axis=1
        )
        terdekat = sisa.loc[sisa["jarak"].idxmin()]
        rute.append(terdekat["nama_tempat_wisata"])
        lat, lon = terdekat["latitude"], terdekat["longitude"]
        sisa = sisa.drop(terdekat.name)

    return rute


@st.cache_data(show_spinner=False, ttl=3600)
def ambil_jalur_osrm(titik):
    """Jalur jalan asli + jarak total dari OSRM. `titik` adalah tuple berisi (lat, lon)."""
    koordinat = ";".join(f"{lon},{lat}" for lat, lon in titik)
    res = requests.get(
        f"{OSRM_URL}/{koordinat}?overview=full&geometries=geojson", timeout=OSRM_TIMEOUT
    )
    res.raise_for_status()
    data = res.json()
    if data.get("code") != "Ok":
        raise RuntimeError(f"OSRM gagal: {data.get('code')} {data.get('message', '')}")

    rute = data["routes"][0]
    jalur = [[lat, lon] for lon, lat in rute["geometry"]["coordinates"]]
    return jalur, rute["distance"] / 1000, rute["duration"] / 60


def hitung_rute(destinasi, start_lat, start_lon):
    """Buat rute utama (greedy) dan rute alternatif (urutan dibalik) dengan data OSRM."""
    lookup = destinasi.set_index("nama_tempat_wisata")
    utama = rute_greedy(destinasi, start_lat, start_lon)
    alternatif = utama[::-1]

    def detail(urutan):
        titik = tuple(
            [(start_lat, start_lon)]
            + [(lookup.loc[n, "latitude"], lookup.loc[n, "longitude"]) for n in urutan]
        )
        jalur, km, menit = ambil_jalur_osrm(titik)
        return {"urutan": urutan, "jalur": jalur, "km": km, "menit": menit}

    return {
        "start": (start_lat, start_lon),
        "data": destinasi,
        "utama": detail(utama),
        "alternatif": detail(alternatif),
    }


def tabel_urutan(hasil, urutan):
    lookup = hasil["data"].set_index("nama_tempat_wisata")
    baris = lookup.loc[urutan].reset_index()
    tabel = pd.DataFrame(
        {
            "Urutan": range(1, len(baris) + 1),
            "Tempat": baris["nama_tempat_wisata"],
            "Wilayah": baris["kabupaten_kota"],
            "Kategori": baris["kategori"],
            "Rating": baris["rating"],
            "Google Maps": baris["link_google_maps"],
        }
    )
    return tabel


def buat_peta(hasil):
    start_lat, start_lon = hasil["start"]
    lookup = hasil["data"].set_index("nama_tempat_wisata")
    utama, alt = hasil["utama"], hasil["alternatif"]

    peta = folium.Map(location=[start_lat, start_lon], zoom_start=11, tiles=TILES, attr=TILES_ATTR)

    # Start marker
    folium.Marker(
        [start_lat, start_lon],
        tooltip="Titik awal",
        icon=folium.Icon(color="red", icon="home"),
    ).add_to(peta)

    # Destination markers, numbered by the main route order
    for i, nama in enumerate(utama["urutan"], start=1):
        row = lookup.loc[nama]
        popup = f"<b>{nama}</b><br>{row['kategori']} · rating {row['rating']}"
        angka = (
            '<div style="background:#0F766E;color:#fff;border-radius:50%;width:26px;'
            'height:26px;line-height:26px;text-align:center;font-weight:600;'
            f'border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)">{i}</div>'
        )
        folium.Marker(
            [row["latitude"], row["longitude"]],
            popup=folium.Popup(popup, max_width=250),
            tooltip=f"{i}. {nama}",
            icon=folium.DivIcon(html=angka, icon_size=(26, 26), icon_anchor=(13, 13)),
        ).add_to(peta)

    # Routes as toggleable layers
    fg_utama = folium.FeatureGroup(name=f"Rute utama - hijau ({utama['km']:.1f} km)")
    folium.PolyLine(
        utama["jalur"], color="green", weight=6, opacity=0.9,
        tooltip=f"Rute utama: {utama['km']:.1f} km",
    ).add_to(fg_utama)

    fg_alt = folium.FeatureGroup(name=f"Rute alternatif - biru putus-putus ({alt['km']:.1f} km)")
    folium.PolyLine(
        alt["jalur"], color="blue", weight=5, opacity=0.9, dash_array="10, 10",
        tooltip=f"Rute alternatif: {alt['km']:.1f} km",
    ).add_to(fg_alt)

    fg_utama.add_to(peta)
    fg_alt.add_to(peta)
    folium.LayerControl(position="topright").add_to(peta)

    semua = [(start_lat, start_lon)] + [
        (lookup.loc[n, "latitude"], lookup.loc[n, "longitude"]) for n in utama["urutan"]
    ]
    peta.fit_bounds(semua, padding=(30, 30))
    return peta


df = load_data()

st.title("Lokayana")

# ---- Sidebar: inputs --------------------------------------------------------
with st.sidebar:
    st.header("Rencanakan perjalanan")

    st.subheader("Titik awal")
    c1, c2 = st.columns(2)
    start_lat = c1.number_input("Lintang (lat)", value=DEFAULT_LAT, format="%.4f")
    start_lon = c2.number_input("Bujur (lon)", value=DEFAULT_LON, format="%.4f")

    st.subheader("Destinasi")
    area = st.selectbox("Wilayah", ["Semua wilayah"] + sorted(df["kabupaten_kota"].dropna().unique()))
    kategori = st.selectbox("Kategori", ["Semua kategori"] + sorted(df["kategori"].dropna().unique()))

    pilihan_df = df
    if area != "Semua wilayah":
        pilihan_df = pilihan_df[pilihan_df["kabupaten_kota"] == area]
    if kategori != "Semua kategori":
        pilihan_df = pilihan_df[pilihan_df["kategori"] == kategori]

    # Pilihan sebelumnya tetap muncul walau filter diganti
    pilihan_lama = st.session_state.get("pilihan", [])
    opsi = sorted(set(pilihan_df["nama_tempat_wisata"]) | set(pilihan_lama))

    pilihan = st.multiselect(
        f"Tempat wisata (maksimal {MAX_DESTINASI})",
        opsi,
        key="pilihan",
        max_selections=MAX_DESTINASI,
        placeholder="Cari nama tempat wisata",
    )

    cari = st.button("Cari rute", type="primary", width="stretch", disabled=not pilihan)

# ---- Compute ---------------------------------------------------------------
if cari:
    terpilih = df[df["nama_tempat_wisata"].isin(pilihan)]
    try:
        with st.spinner("Menghitung rute..."):
            st.session_state["hasil"] = hitung_rute(terpilih, start_lat, start_lon)
    except (requests.RequestException, RuntimeError) as e:
        st.session_state.pop("hasil", None)
        st.error(f"Gagal mengambil data jalan dari OSRM. Periksa koneksi internet lalu coba lagi.\n\n{e}")

# ---- Output ----------------------------------------------------------------
hasil = st.session_state.get("hasil")

if not hasil:
    st.info("Pilih minimal satu destinasi di sidebar, lalu klik **Cari rute**.")
else:
    utama, alt = hasil["utama"], hasil["alternatif"]
    selisih = alt["km"] - utama["km"]

    m1, m2, m3 = st.columns(3)
    m1.metric("Rute utama", f"{utama['km']:.1f} km", f"{utama['menit']:.0f} menit perjalanan", delta_color="off")
    m2.metric(
        "Rute alternatif", f"{alt['km']:.1f} km",
        f"{selisih:+.1f} km dari rute utama", delta_color="inverse",
    )
    m3.metric("Jumlah pemberhentian", len(utama["urutan"]))

    tab_peta, tab_urutan = st.tabs(["Peta", "Urutan kunjungan"])

    with tab_peta:
        st_folium(
            buat_peta(hasil), height=560, use_container_width=True,
            returned_objects=[], key="peta",
        )

    with tab_urutan:
        link_cfg = {"Google Maps": st.column_config.LinkColumn("Google Maps", display_text="Buka")}
        col_a, col_b = st.columns(2)
        with col_a:
            st.subheader("Rute utama")
            st.dataframe(tabel_urutan(hasil, utama["urutan"]), hide_index=True,
                         column_config=link_cfg, width="stretch")
        with col_b:
            st.subheader("Rute alternatif")
            st.dataframe(tabel_urutan(hasil, alt["urutan"]), hide_index=True,
                         column_config=link_cfg, width="stretch")
