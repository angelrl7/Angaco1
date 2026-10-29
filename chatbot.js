/**
 * ===================================================
 * CHATBOT MUNICIPAL - DEPARTAMENTO ANGACO
 * Archivo: chatbot.js
 * ===================================================
 */

(function () {
  // Configuración de coordenadas de referencia en Angaco, San Juan
  const ANGACO_COORDS = {
    municipalidad: { lat: -31.3960, lon: -68.4310, nombre: "Municipalidad de Angaco (Villa El Salvador)" },
    hospital: { lat: -31.3995, lon: -68.4300, nombre: "Hospital Dr. Alfredo Rizo Esparza" },
    comisaria: { lat: -31.3950, lon: -68.4320, nombre: "Comisaría 20ª de Angaco" }
  };

  // Estado del usuario y ubicación
  let userLocation = null;
  let isRequestingLocation = false;

  // Elementos del DOM
  const chatToggleBtn = document.getElementById('chatToggleBtn');
  const chatWindow = document.getElementById('chatWindow');
  const chatCloseBtn = document.getElementById('chatCloseBtn');
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const locationBanner = document.getElementById('locationBanner');
  const btnRequestLocation = document.getElementById('btnRequestLocation');
  const locationStatus = document.getElementById('locationStatus');
  const quickChipsContainer = document.getElementById('quickChips');

  // Inicialización
  function init() {
    setupEventListeners();
  }

  function setupEventListeners() {
    // Abrir / Cerrar Chat
    chatToggleBtn.addEventListener('click', toggleChat);
    chatCloseBtn.addEventListener('click', () => toggleChat(false));

    // Pedir permiso de ubicación
    if (btnRequestLocation) {
      btnRequestLocation.addEventListener('click', requestUserLocation);
    }

    // Enviar mensaje por formulario
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      handleUserMessage(text);
      chatInput.value = '';
    });

    // Chips de preguntas frecuentes
    if (quickChipsContainer) {
      quickChipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.chat-chip');
        if (chip) {
          const query = chip.getAttribute('data-query');
          if (query) {
            handleUserMessage(query);
          }
        }
      });
    }
  }

  function toggleChat(forceState) {
    const isVisible = chatWindow.classList.contains('active');
    const newState = typeof forceState === 'boolean' ? forceState : !isVisible;

    if (newState) {
      chatWindow.classList.add('active');
      chatToggleBtn.classList.add('chat-open');
      chatInput.focus();

      // Si no tenemos ubicación todavía, sugerir pedirla en el primer ingreso
      if (!userLocation && !isRequestingLocation && !localStorage.getItem('muni_location_prompted')) {
        setTimeout(requestUserLocation, 600);
        localStorage.setItem('muni_location_prompted', 'true');
      }
    } else {
      chatWindow.classList.remove('active');
      chatToggleBtn.classList.remove('chat-open');
    }
  }

  /**
   * Solicita el permiso del navegador para obtener las coordenadas del vecino
   */
  function requestUserLocation() {
    if (!navigator.geolocation) {
      updateLocationUI(false, "Geolocalización no soportada en este navegador");
      return;
    }

    isRequestingLocation = true;
    updateLocationUI('loading', "Solicitando permiso de ubicación...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        isRequestingLocation = false;
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Calcular distancia a la Municipalidad
        const distKm = calculateDistanceKm(lat, lon, ANGACO_COORDS.municipalidad.lat, ANGACO_COORDS.municipalidad.lon);

        userLocation = {
          lat: lat,
          lon: lon,
          distToMuni: distKm,
          precision: Math.round(position.coords.accuracy)
        };

        const statusMsg = `Ubicación activa (~${distKm.toFixed(1)} km de la Municipalidad)`;
        updateLocationUI(true, statusMsg);

        // Mensaje del bot confirmando la ubicación
        let saludoUbicacion = `📍 ¡Permiso de ubicación concedido! Veo que estás aproximadamente a **${distKm.toFixed(1)} km** de la Municipalidad de Angaco.`;
        if (distKm <= 15) {
          saludoUbicacion += " Estás dentro del área de cobertura departamental. Puedo ayudarte con centros de salud más cercanos, recolección en tu barrio y trámites.";
        } else {
          saludoUbicacion += " Parece que estás fuera de la cabecera departamental, pero puedo responder todas tus consultas sobre Angaco igualmente.";
        }

        appendBotMessage(saludoUbicacion);
      },
      (error) => {
        isRequestingLocation = false;
        let errorMsg = "Ubicación no concedida";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Permiso de ubicación denegado por el usuario";
        }
        updateLocationUI(false, errorMsg);
        appendBotMessage("No hay problema, podés continuar consultando información general sobre el municipio sin compartir tu ubicación.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  /**
   * Actualiza el banner y chip de estado de ubicación en la interfaz
   */
  function updateLocationUI(state, message) {
    if (locationStatus) {
      locationStatus.textContent = message;
    }

    if (state === true) {
      if (locationBanner) {
        locationBanner.classList.add('granted');
        locationBanner.innerHTML = `<span>📍 <strong>Ubicación conectada:</strong> ${message}</span>`;
      }
    } else if (state === 'loading') {
      if (locationBanner) {
        locationBanner.innerHTML = `<span>⏳ ${message}</span>`;
      }
    } else {
      if (locationBanner) {
        locationBanner.classList.remove('granted');
        locationBanner.innerHTML = `
          <span>📍 Activa tu ubicación para respuestas sobre tu barrio</span>
          <button id="btnRequestLocationRetry" class="btn-location-action">Permitir</button>
        `;
        const retryBtn = document.getElementById('btnRequestLocationRetry');
        if (retryBtn) retryBtn.addEventListener('click', requestUserLocation);
      }
    }
  }

  /**
   * Procesa el mensaje ingresado por el usuario
   */
  function handleUserMessage(text) {
    appendUserMessage(text);

    // Indicador de escribiendo
    const typingIndicator = showTypingIndicator();

    setTimeout(() => {
      typingIndicator.remove();
      const response = generateMunicipalResponse(text);
      appendBotMessage(response);
    }, 700);
  }

  /**
   * Motor de respuestas de conocimiento municipal para Angaco
   */
  function generateMunicipalResponse(query) {
    const q = query.toLowerCase();

    // 1. Dónde queda la municipalidad / Ubicación física
    if (q.includes('donde') || q.includes('dónde') || q.includes('queda') || q.includes('direccion') || q.includes('dirección') || q.includes('edificio') || q.includes('ubicacion') || q.includes('ubicación')) {
      let resp = "🏛️ **Sede Central de la Municipalidad de Angaco:**\n" +
                 "Calle Teresa de Mallea y San Martín, Villa El Salvador, Angaco, San Juan.\n" +
                 "⏰ **Horario de atención:** Lunes a Viernes de 07:00 a 13:00 hs.";
      
      if (userLocation) {
        resp += `\n\n📍 Desde tu ubicación actual estás aproximadamente a **${userLocation.distToMuni.toFixed(1)} km** de la sede central.`;
      } else {
        resp += "\n\n💡 *Tip: Si activás el permiso de ubicación arriba, puedo decirte la distancia exacta desde donde estás.*";
      }
      return resp;
    }

    // 2. Salud / Hospital / Urgencias
    if (q.includes('salud') || q.includes('hospital') || q.includes('medico') || q.includes('médico') || q.includes('guardia') || q.includes('urgencia') || q.includes('ambulancia')) {
      let resp = "🏥 **Atención Médica y Urgencias en Angaco:**\n" +
                 "• **Hospital Dr. Alfredo Rizo Esparza:** Guardia 24 horas y consultorios externos (Villa El Salvador).\n" +
                 "• **Teléfono de Emergencias Médicas:** 107\n" +
                 "• **Centros de Atención Primaria (CAPS):** Hay puestos sanitarios en Campo Afuera, Las Tapias y El Plomer.";

      if (userLocation) {
        const distHospital = calculateDistanceKm(userLocation.lat, userLocation.lon, ANGACO_COORDS.hospital.lat, ANGACO_COORDS.hospital.lon);
        resp += `\n\n📍 Te encontrás a **${distHospital.toFixed(1)} km** del Hospital Dr. Alfredo Rizo Esparza.`;
      }
      return resp;
    }

    // 3. Recolección de residuos / Basura / Limpieza
    if (q.includes('basura') || q.includes('recoleccion') || q.includes('recolección') || q.includes('residuos') || q.includes('limpieza') || q.includes('camion')) {
      return "🚛 **Cronograma de Recolección de Residuos:**\n" +
             "• **Villa El Salvador (Centro):** Lunes, Miércoles y Viernes a partir de las 06:00 hs.\n" +
             "• **Campo Afuera y Las Tapias:** Martes, Jueves y Sábados desde las 07:00 hs.\n" +
             "• **Verdes y Escombros:** Podés solicitar contenedor especial comunicándote con Servicios Públicos al 0264-4972000.";
    }

    // 4. Carnet de conducir / Licencia
    if (q.includes('licencia') || q.includes('carnet') || q.includes('conducir') || q.includes('registro') || q.includes('manejar')) {
      return "🚗 **Licencia Nacional de Conducir:**\n" +
             "1. Solicitar turno previo de Lunes a Viernes de 07:30 a 12:30 hs en la oficina de Tránsito.\n" +
             "2. Requisitos: DNI con domicilio en el departamento, boleta CENAT abonada, y curso teórico (si es primera vez o ampliación).\n" +
             "3. Examen médico y psicofísico se realiza en el mismo centro emisor.";
    }

    // 5. Tasas municipales / Rentas / Impuestos
    if (q.includes('tasa') || q.includes('impuesto') || q.includes('rentas') || q.includes('pago') || q.includes('boleta') || q.includes('deuda')) {
      return "💳 **Tasas Municipales y Rentas:**\n" +
             "• Podés abonar tu boleta de contribución municipal en las cajas del edificio central de 07:00 a 13:00 hs.\n" +
             "• Medios habilitados: Efectivo, tarjetas de débito/crédito y transferencias electrónicas.\n" +
             "• Para solicitar estado de deuda o reimpresión de boleta, acércate a la Dirección de Rentas.";
    }

    // 6. Seguridad / Comisaría / Teléfonos de emergencia
    if (q.includes('policia') || q.includes('policía') || q.includes('comisaria') || q.includes('comisaría') || q.includes('denuncia') || q.includes('seguridad') || q.includes('telefono') || q.includes('teléfono') || q.includes('contacto')) {
      let resp = "📞 **Teléfonos Útiles y de Emergencia:**\n" +
                 "• **Emergencias Generales:** 911\n" +
                 "• **Comisaría 20ª de Angaco:** 0264-4972010\n" +
                 "• **Hospital Rizo Esparza:** 0264-4972025\n" +
                 "• **Municipalidad (Mesa de Entradas):** 0264-4972000";
      
      if (userLocation) {
        const distComisaria = calculateDistanceKm(userLocation.lat, userLocation.lon, ANGACO_COORDS.comisaria.lat, ANGACO_COORDS.comisaria.lon);
        resp += `\n\n📍 La Comisaría 20ª se encuentra a **${distComisaria.toFixed(1)} km** de tu ubicación actual.`;
      }
      return resp;
    }

    // 7. Turismo / Lugares
    if (q.includes('turismo') || q.includes('visitar') || q.includes('paseo') || q.includes('expedito') || q.includes('san expedito') || q.includes('lugar')) {
      return "🌄 **Puntos Turísticos y de Interés en Angaco:**\n" +
             "• **Santuario San Expedito (Bermejo):** Punto de peregrinación y devoción provincial.\n" +
             "• **Quebrada de Guayaupa:** Hermosos paisajes naturales y senderismo.\n" +
             "• **Ruta del Vino y Bodegas:** Productores vitivinícolas artesanales y de uva de mesa.";
    }

    // Saludo
    if (q.includes('hola') || q.includes('buen dia') || q.includes('buenos dias') || q.includes('buenas tardes')) {
      return "¡Hola! Soy el asistente virtual del Municipio de Angaco. ¿En qué trámite o consulta sobre el departamento te puedo ayudar hoy?";
    }

    // Agradecimiento
    if (q.includes('gracias') || q.includes('muchas gracias')) {
      return "¡De nada! Si tenés otra pregunta sobre trámites, recolección o servicios en Angaco, estoy a tu disposición.";
    }

    // Respuesta por defecto con sugerencias
    return "Entendido. Para darte información precisa sobre el departamento Angaco, podés preguntarme sobre:\n" +
           "• 🏛️ **Ubicación y horarios** del municipio.\n" +
           "• 🏥 **Hospital y centros de salud** cercanos.\n" +
           "• 🚛 **Días de recolección** de residuos por zona.\n" +
           "• 🚗 **Renovación del carnet** de conducir.\n" +
           "• 📞 **Teléfonos de emergencia** y comisarías.";
  }

  /**
   * Cálculo de distancia en km usando fórmula de Haversine
   */
  function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Renderizado de mensajes en el chat
   */
  function appendUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'chat-bubble chat-user';
    msg.textContent = text;
    chatMessages.appendChild(msg);
    scrollChatToBottom();
  }

  function appendBotMessage(markdownText) {
    const msg = document.createElement('div');
    msg.className = 'chat-bubble chat-bot';
    
    // Parseo simple de negritas y saltos de línea para el bot
    const formatted = markdownText
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    
    msg.innerHTML = formatted;
    chatMessages.appendChild(msg);
    scrollChatToBottom();
  }

  function showTypingIndicator() {
    const typing = document.createElement('div');
    typing.className = 'chat-bubble chat-bot typing-indicator';
    typing.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typing);
    scrollChatToBottom();
    return typing;
  }

  function scrollChatToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
