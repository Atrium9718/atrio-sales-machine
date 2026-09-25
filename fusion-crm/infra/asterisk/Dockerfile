# ==============================================================================
# FUSION CRM — DOCKERFILE DE ASTERISK 22 LTS (ETAPA 17.2)
# Versión obligatoria: 22.6.0 o superior (incluye chan_websocket para Agente IA)
# ==============================================================================
FROM debian:bookworm-slim

LABEL maintainer="sistemas@fusioncg.com"
LABEL description="Asterisk 22 LTS con ARI, WebRTC (WSS/DTLS), Opus y chan_websocket para Fusion CRM"

# Versión fijada de Asterisk 22 LTS (NUNCA usar 'latest')
ARG ASTERISK_VERSION=22.6.0
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependencias del sistema y compilación
RUN apt-get update && apt-get install -y --no-install-recommends \
    autoconf \
    automake \
    build-essential \
    bzip2 \
    ca-certificates \
    curl \
    gettext-base \
    git \
    iproute2 \
    libedit-dev \
    libgsm1-dev \
    libjansson-dev \
    libnewt-dev \
    libogg-dev \
    libopus-dev \
    libpopt-dev \
    libspeex-dev \
    libspeexdsp-dev \
    libsqlite3-dev \
    libssl-dev \
    libsrtp2-dev \
    liburiparser-dev \
    libuuid1 \
    libvorbis-dev \
    libxml2-dev \
    libxslt1-dev \
    net-tools \
    procps \
    subversion \
    tar \
    uuid-dev \
    wget \
    xmlstarlet \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src

# Descargar código fuente oficial de Asterisk 22.6.0
RUN curl -fsSL http://downloads.asterisk.org/pub/telephony/asterisk/releases/asterisk-${ASTERISK_VERSION}.tar.gz | tar -xz \
    && cd asterisk-${ASTERISK_VERSION} \
    # Instalar dependencias adicionales de Asterisk
    && ./contrib/scripts/install_prereq install-unpackaged || true \
    # Configurar opciones de compilación
    && ./configure \
        --with-jansson \
        --with-pjproject-bundled \
        --with-ssl \
        --with-srtp \
        --with-opus \
        --with-crypto \
        --without-radius \
        --prefix=/usr \
        --sysconfdir=/etc \
        --localstatedir=/var \
    # Configurar menuselect habilitando módulos requeridos y descartando innecesarios
    && make menuselect.makeopts \
    && menuselect/menuselect \
        --enable res_ari \
        --enable res_ari_applications \
        --enable res_ari_asterisk \
        --enable res_ari_bridges \
        --enable res_ari_channels \
        --enable res_ari_device_states \
        --enable res_ari_endpoints \
        --enable res_ari_events \
        --enable res_ari_playbacks \
        --enable res_ari_recordings \
        --enable res_ari_sounds \
        --enable res_stasis \
        --enable res_stasis_answer \
        --enable res_stasis_playback \
        --enable res_stasis_recording \
        --enable res_stasis_snoop \
        --enable res_pjsip \
        --enable res_pjsip_transport_websocket \
        --enable res_http_websocket \
        --enable res_srtp \
        --enable res_crypto \
        --enable codec_opus \
        --enable chan_websocket \
        --enable res_speech \
        --enable app_mixmonitor \
        --enable func_talkdetect \
        --enable res_musiconhold \
        --enable res_rtp_asterisk \
        --enable res_format_attr_opus \
        --enable CORE-SOUNDS-ES-WAV \
        --enable MOH-OPSOUND-WAV \
        --disable app_voicemail \
        --disable app_queue \
        --disable res_phoneprov \
        --disable cdr_csv \
        --disable cdr_custom \
        --disable cel_custom \
        menuselect.makeopts \
    && make -j$(nproc) \
    && make install \
    && make samples || true \
    && make config || true \
    && cd /usr/src \
    && rm -rf asterisk-${ASTERISK_VERSION}

# Crear usuario y directorios del sistema para Asterisk
RUN groupadd -r asterisk && useradd -r -g asterisk -d /var/lib/asterisk -s /sbin/nologin asterisk \
    && mkdir -p /var/lib/asterisk/sounds/fusion \
    && mkdir -p /var/spool/asterisk/recording \
    && mkdir -p /var/log/asterisk \
    && mkdir -p /etc/asterisk.templates \
    && chown -R asterisk:asterisk /var/lib/asterisk /var/spool/asterisk /var/log/asterisk /etc/asterisk /etc/asterisk.templates

# Copiar script de arranque y plantillas de configuración
COPY etc/ /etc/asterisk.templates/
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Puertos expuestos:
# 5060/udp, 5060/tcp (SIP señalización troncal)
# 8088/tcp (HTTP/WebSocket ARI y WSS interno)
# 10000-10200/udp (RTP Media)
EXPOSE 5060/udp 5060/tcp 8088/tcp 10000-10200/udp

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["asterisk", "-f", "-U", "asterisk", "-G", "asterisk", "-vvvddd"]
