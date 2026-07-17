#!/bin/bash
# test-full-flow.sh - Test complet du flow Djorssi Express

echo "========================================="
echo "   🎵 DJORSSI EXPRESS - TEST COMPLET"
echo "========================================="

BASE_URL="http://localhost:5000"
DJ_EMAIL="dj_test@test.com"
DJ_PASSWORD="Test123!"
EMP_EMAIL="emp_test@test.com"
EMP_PASSWORD="Test123!"
ADMIN_EMAIL="admin@djorssi.com"
ADMIN_PASSWORD="Admin123!"

# Fonction pour afficher les résultats
print_result() {
    if [ "$1" == "0" ]; then
        echo "✅ $2"
    else
        echo "❌ $2"
        exit 1
    fi
}

# =========================================
# 1. INSCRIPTION
# =========================================
echo -e "\n📝 1. INSCRIPTIONS"

# Inscription DJ
echo "   - Inscription DJ..."
DJ_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dj_test",
    "email": "dj_test@test.com",
    "phone": "0612345678",
    "password": "Test123!",
    "first_name": "Marc",
    "last_name": "DJ",
    "user_type": "djorssi"
  }')
print_result $? "DJ inscrit"

# Inscription Employeur
echo "   - Inscription Employeur..."
EMP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "emp_test",
    "email": "emp_test@test.com",
    "phone": "0698765432",
    "password": "Test123!",
    "first_name": "Jean",
    "last_name": "Dupont",
    "user_type": "employeur",
    "company_name": "Djorssi Events"
  }')
print_result $? "Employeur inscrit"

# Inscription Admin
echo "   - Inscription Admin..."
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@djorssi.com",
    "phone": "0101010101",
    "password": "Admin123!",
    "first_name": "Super",
    "last_name": "Admin",
    "user_type": "admin"
  }')
print_result $? "Admin inscrit"

# =========================================
# 2. CONNEXION
# =========================================
echo -e "\n🔐 2. CONNEXIONS"

# Login DJ
echo "   - Login DJ..."
DJ_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DJ_EMAIL\",\"password\":\"$DJ_PASSWORD\"}" | jq -r '.data.token')
if [ "$DJ_TOKEN" != "null" ] && [ -n "$DJ_TOKEN" ]; then
    echo "✅ DJ connecté (token: ${DJ_TOKEN:0:20}...)"
else
    echo "❌ Échec login DJ"
    exit 1
fi

# Login Employeur
echo "   - Login Employeur..."
EMP_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMP_EMAIL\",\"password\":\"$EMP_PASSWORD\"}" | jq -r '.data.token')
if [ "$EMP_TOKEN" != "null" ] && [ -n "$EMP_TOKEN" ]; then
    echo "✅ Employeur connecté (token: ${EMP_TOKEN:0:20}...)"
else
    echo "❌ Échec login Employeur"
    exit 1
fi

# Login Admin
echo "   - Login Admin..."
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | jq -r '.data.token')
if [ "$ADMIN_TOKEN" != "null" ] && [ -n "$ADMIN_TOKEN" ]; then
    echo "✅ Admin connecté (token: ${ADMIN_TOKEN:0:20}...)"
else
    echo "❌ Échec login Admin"
    exit 1
fi

# =========================================
# 3. CATÉGORIES
# =========================================
echo -e "\n🏷️ 3. GESTION DES CATÉGORIES"

# Créer une catégorie (Admin)
echo "   - Création de la catégorie 'Soirée'..."
CATEGORY_ID=$(curl -s -X POST "$BASE_URL/api/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Soirée",
    "slug": "soiree",
    "description": "Missions pour soirées et événements festifs",
    "icon": "🎉",
    "color": "#FF6B6B"
  }' | jq -r '.data.category.id')
print_result $? "Catégorie créée (ID: $CATEGORY_ID)"

# =========================================
# 4. MISSIONS
# =========================================
echo -e "\n🎯 4. GESTION DES MISSIONS"

# Créer une mission (Employeur)
echo "   - Création de la mission..."
MISSION_ID=$(curl -s -X POST "$BASE_URL/api/missions/create" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Soirée DJ au Palm Beach\",
    \"description\": \"Recherche 2 DJs pour animer la soirée\",
    \"mission_type\": \"soiree\",
    \"lieu\": \"Palm Beach\",
    \"ville\": \"Abidjan\",
    \"quartier\": \"Cocody\",
    \"date_mission\": \"2026-01-01T20:00:00.000Z\",
    \"date_limite_candidature\": \"2025-12-20T23:59:59.000Z\",
    \"nb_djs_requis\": 2,
    \"budget\": 150000,
    \"category_id\": \"$CATEGORY_ID\"
  }" | jq -r '.data.mission.id')
print_result $? "Mission créée (ID: $MISSION_ID)"

# Publier la mission
echo "   - Publication de la mission..."
curl -s -X POST "$BASE_URL/api/missions/publier/$MISSION_ID" \
  -H "Authorization: Bearer $EMP_TOKEN" > /dev/null
print_result $? "Mission publiée"

# Voir les missions (DJ)
echo "   - Consultation des missions (DJ)..."
MISSIONS_COUNT=$(curl -s -X GET "$BASE_URL/api/missions/getAll" \
  -H "Authorization: Bearer $DJ_TOKEN" | jq '.data.missions | length')
print_result $? "Voir missions: $MISSIONS_COUNT mission(s) trouvée(s)"

# =========================================
# 5. CANDIDATURES
# =========================================
echo -e "\n📝 5. CANDIDATURES"

# Postuler (DJ)
echo "   - Postulation (DJ)..."
CANDIDATURE_ID=$(curl -s -X POST "$BASE_URL/api/missions/$MISSION_ID/candidatures/postuler" \
  -H "Authorization: Bearer $DJ_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message_motivation": "Je suis très intéressé par cette mission",
    "prix_propose": 60000
  }' | jq -r '.data.candidature.id')
print_result $? "Candidature créée (ID: $CANDIDATURE_ID)"

# Voir les candidatures (Employeur)
echo "   - Consultation des candidatures (Employeur)..."
CANDIDATURES_COUNT=$(curl -s -X GET "$BASE_URL/api/missions/$MISSION_ID/candidatures" \
  -H "Authorization: Bearer $EMP_TOKEN" | jq '.data.candidatures | length')
print_result $? "Voir candidatures: $CANDIDATURES_COUNT candidature(s)"

# Traiter la candidature (Employeur)
echo "   - Traitement de la candidature (Acceptation)..."
curl -s -X PUT "$BASE_URL/api/missions/$MISSION_ID/candidatures/$CANDIDATURE_ID/traiter" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "acceptee",
    "commentaire": "Félicitations ! Vous êtes retenu.",
    "remuneration": 65000
  }' > /dev/null
print_result $? "Candidature acceptée"

# =========================================
# 6. AVIS
# =========================================
echo -e "\n⭐ 6. AVIS"

# Terminer la mission (Employeur)
echo "   - Terminer la mission..."
curl -s -X PUT "$BASE_URL/api/missions/update/$MISSION_ID" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "terminee"}' > /dev/null
print_result $? "Mission terminée"

# Créer un avis (Employeur)
echo "   - Création d'un avis (Employeur)..."
DJ_ID=$(curl -s -X GET "$BASE_URL/api/users/me" \
  -H "Authorization: Bearer $DJ_TOKEN" | jq -r '.data.user.id')
AVIS_ID=$(curl -s -X POST "$BASE_URL/api/missions/$MISSION_ID/avis" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"note\": 5,
    \"commentaire\": \"Excellent travail !\",
    \"cible_id\": \"$DJ_ID\"
  }" | jq -r '.data.avis.id')
print_result $? "Avis créé (ID: $AVIS_ID)"

# =========================================
# 7. PAIEMENTS
# =========================================
echo -e "\n💰 7. PAIEMENTS"

# Créer un paiement (Employeur)
echo "   - Création d'un paiement..."
PAIEMENT_ID=$(curl -s -X POST "$BASE_URL/api/missions/$MISSION_ID/paiements" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"montant\": 65000,
    \"mode_paiement\": \"mobile_money\",
    \"reference\": \"TEST123456\",
    \"candidature_id\": \"$CANDIDATURE_ID\"
  }" | jq -r '.data.paiement.id')
print_result $? "Paiement créé (ID: $PAIEMENT_ID)"

# =========================================
# 8. NOTIFICATIONS
# =========================================
echo -e "\n🔔 8. NOTIFICATIONS"

# Voir les notifications (DJ)
echo "   - Consultation des notifications (DJ)..."
NOTIF_COUNT=$(curl -s -X GET "$BASE_URL/api/notifications" \
  -H "Authorization: Bearer $DJ_TOKEN" | jq '.data.notifications | length')
print_result $? "Notifications: $NOTIF_COUNT"

# =========================================
# 9. PROFIL
# =========================================
echo -e "\n👤 9. PROFIL"

# Voir le profil (DJ)
echo "   - Consultation du profil (DJ)..."
PROFILE=$(curl -s -X GET "$BASE_URL/api/users/me" \
  -H "Authorization: Bearer $DJ_TOKEN" | jq -r '.data.user.username')
print_result $? "Profil: $PROFILE"

# Mettre à jour le profil (DJ)
echo "   - Mise à jour du profil (DJ)..."
curl -s -X PUT "$BASE_URL/api/users/me" \
  -H "Authorization: Bearer $DJ_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "DJ professionnel depuis 5 ans, spécialisé dans les soirées"
  }' > /dev/null
print_result $? "Profil mis à jour"

# =========================================
# 10. VÉRIFICATION D'IDENTITÉ
# =========================================
echo -e "\n🛡️ 10. VÉRIFICATION D'IDENTITÉ"

# Soumettre des documents (DJ)
echo "   - Soumission des documents d'identité (DJ)..."
DOCUMENT_ID=$(curl -s -X POST "$BASE_URL/api/identity/submit" \
  -H "Authorization: Bearer $DJ_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "document_type": "cni",
        "document_number": "CNI123456789",
        "document_front_url": "https://example.com/cni_front.jpg"
      }
    ]
  }' | jq -r '.data.documents[0].id')
print_result $? "Documents soumis (ID: $DOCUMENT_ID)"

# Approuver la vérification (Admin)
echo "   - Approbation de la vérification (Admin)..."
curl -s -X POST "$BASE_URL/api/identity/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"document_id\": \"$DOCUMENT_ID\"}" > /dev/null
print_result $? "Vérification approuvée"

# =========================================
# 11. MESSAGERIE
# =========================================
echo -e "\n💬 11. MESSAGERIE"

# Créer une conversation (Employeur → DJ)
echo "   - Création d'une conversation (Employeur → DJ)..."
CONVERSATION_ID=$(curl -s -X POST "$BASE_URL/api/conversations" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"participant_id\": \"$DJ_ID\",
    \"mission_id\": \"$MISSION_ID\",
    \"initial_message\": \"Bonjour, félicitations pour votre sélection !\"
  }" | jq -r '.data.conversation.id')
print_result $? "Conversation créée (ID: $CONVERSATION_ID)"

# Envoyer un message (Employeur)
echo "   - Envoi d'un message (Employeur)..."
MESSAGE_ID=$(curl -s -X POST "$BASE_URL/api/conversations/$CONVERSATION_ID/messages" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Nous vous confirmons la mission du 1er janvier."
  }' | jq -r '.data.message.id')
print_result $? "Message envoyé (ID: $MESSAGE_ID)"

# Voir les messages (DJ)
echo "   - Consultation des messages (DJ)..."
MESSAGES_COUNT=$(curl -s -X GET "$BASE_URL/api/conversations/$CONVERSATION_ID/messages" \
  -H "Authorization: Bearer $DJ_TOKEN" | jq '.data.messages | length')
print_result $? "Messages: $MESSAGES_COUNT"

# =========================================
# 12. RÉSULTATS FINAUX
# =========================================
echo -e "\n========================================="
echo "   ✅ TESTS TERMINÉS AVEC SUCCÈS !"
echo "========================================="
echo ""
echo "📊 RÉSUMÉ DU FLOW :"
echo "   ✅ Inscription (DJ, Employeur, Admin)"
echo "   ✅ Connexion (DJ, Employeur, Admin)"
echo "   ✅ Catégorie créée"
echo "   ✅ Mission créée et publiée"
echo "   ✅ Candidature soumise et acceptée"
echo "   ✅ Avis créé"
echo "   ✅ Paiement effectué"
echo "   ✅ Notifications reçues"
echo "   ✅ Profil mis à jour"
echo "   ✅ Vérification d'identité"
echo "   ✅ Messagerie fonctionnelle"
echo ""
echo "📁 IDs générés :"
echo "   - Category ID : $CATEGORY_ID"
echo "   - Mission ID  : $MISSION_ID"
echo "   - Candidature ID : $CANDIDATURE_ID"
echo "   - Avis ID : $AVIS_ID"
echo "   - Paiement ID : $PAIEMENT_ID"
echo "   - Document ID : $DOCUMENT_ID"
echo "   - Conversation ID : $CONVERSATION_ID"
echo "   - Message ID : $MESSAGE_ID"