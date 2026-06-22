import type { Survey, Question } from '../types'
import { db } from './index'

export const DEMO_SURVEY_ID = 'naviksa-accessibility-study'

export const demoSurvey: Survey = {
  id: DEMO_SURVEY_ID,
  title: 'Naviksa Accessibility Research Study',
  description: 'A study to understand the experiences of visually impaired users and guide future accessibility innovations.',
  created_at: new Date().toISOString()
}

export const demoQuestions: Question[] = [
  {
    id: 'naviksa-q1',
    survey_id: DEMO_SURVEY_ID,
    order: 1,
    type: 'paragraph_short',
    required: true,
    translations: {
      en: { text: "What name would you like us to use when referring to you during this survey?" },
      hi: { text: "आप इस सर्वेक्षण के दौरान आपके लिए किस नाम का उपयोग करना पसंद करेंगे?" },
      hinglish: { text: "Aap is survey ke dauran apna kya naam use karwana chahenge?" },
      mr: { text: "या सर्वेक्षणादरम्यान आम्ही तुमच्यासाठी कोणते नाव वापरावे असे तुम्हाला वाटते?" },
      te: { text: "ఈ సర్వే సమయంలో మిమ్మల్ని ఏ పేరుతో పిలవాలని మీరు కోరుకుంటున్నారు?" },
      ta: { text: "இந்த கணக்கெடுப்பின் போது நாங்கள் உங்களை என்ன பெயரில் குறிப்பிட வேண்டும் என்று விரும்புகிறீர்கள்?" },
      kn: { text: "ಈ ಸಮೀಕ್ಷೆಯ ಸಮಯದಲ್ಲಿ ನಾವು ನಿಮ್ಮನ್ನು ಉಲ್ಲೇಖಿಸಲು ಯಾವ ಹೆಸರನ್ನು ಬಳಸಲು ಬಯಸುತ್ತೀರಿ?" }
    }
  },
  {
    id: 'naviksa-q2',
    survey_id: DEMO_SURVEY_ID,
    order: 2,
    type: 'single_choice',
    required: true,
    translations: {
      en: {
        text: "Which age group do you belong to?",
        options: [
          { id: 'under_18', translations: { en: "Under 18", hi: "18 से कम", hinglish: "18 se kam", mr: "18 पेक्षा कमी", te: "18 సంవత్సరాల లోపు", ta: "18க்கு கீழ்", kn: "18 ವರ್ಷಕ್ಕಿಂತ ಕಡಿಮೆ" } },
          { id: '18_to_25', translations: { en: "18 to 25", hi: "18 से 25", hinglish: "18 se 25", mr: "18 ते 25", te: "18 నుండి 25", ta: "18 முதல் 25", kn: "18 ರಿಂದ 25" } },
          { id: '26_to_40', translations: { en: "26 to 40", hi: "26 से 40", hinglish: "26 se 40", mr: "26 ते 40", te: "26 నుండి 40", ta: "26 முதல் 40", kn: "26 ರಿಂದ 40" } },
          { id: '41_to_60', translations: { en: "41 to 60", hi: "41 से 60", hinglish: "41 se 60", mr: "41 ते 60", te: "41 నుండి 60", ta: "41 முதல் 60", kn: "41 ರಿಂದ 60" } },
          { id: 'above_60', translations: { en: "Above 60", hi: "60 से ऊपर", hinglish: "60 se zyada", mr: "60 पेक्षा जास्त", te: "60 సంవత్సరాల పైబడిన", ta: "60க்கு மேல்", kn: "60 ಕ್ಕಿಂತ ಹೆಚ್ಚು" } },
          { id: 'prefer_not', translations: { en: "Prefer not to say", hi: "बताना नहीं चाहते", hinglish: "Batana nahi chahte", mr: "सांगू इच्छित नाही", te: "చెప్పడానికి ఇష్టపడలేదు", ta: "கூற விரும்பவில்லை", kn: "ಹೇಳಲು ಇಷ್ಟಪಡುವುದಿಲ್ಲ" } }
        ] as any
      },
      hi: { text: "आप किस आयु वर्ग के हैं?" },
      hinglish: { text: "Aap kis age group me aate hain?" },
      mr: { text: "तुम्ही कोणत्या वयोगटातील आहात?" },
      te: { text: "మీరు ఏ వయస్సు వర్గానికి చెందినవారు?" },
      ta: { text: "நீங்கள் எந்த வயதினரைச் சேர்ந்தவர்?" },
      kn: { text: "ನೀವು ಯಾವ ವಯಸ್ಸಿನ ಗುಂಪಿಗೆ ಸೇರಿದವರು?" }
    }
  },
  {
    id: 'naviksa-q3',
    survey_id: DEMO_SURVEY_ID,
    order: 3,
    type: 'paragraph_short',
    required: true,
    translations: {
      en: { text: "Which city, town, or village do you currently live in?" },
      hi: { text: "आप वर्तमान में किस शहर, कस्बे या गाँव में रहते हैं?" },
      hinglish: { text: "Aap abhi kis city, town ya village me rehte hain?" },
      mr: { text: "तुम्ही सध्या कोणत्या शहरात, गावात किंवा खेड्यात राहता?" },
      te: { text: "మీరు ప్రస్తుతం ఏ నగరం, పట్టణం లేదా గ్రామంలో నివసిస్తున్నారు?" },
      ta: { text: "நீங்கள் தற்போது எந்த நகரம், நகரம் அல்லது கிராமத்தில் வசிக்கிறீர்கள்?" },
      kn: { text: "ನೀವು ಪ್ರಸ್ತುತ ಯಾವ ನಗರ, ಪಟ್ಟಣ ಅಥವಾ ಗ್ರಾಮದಲ್ಲಿ ವಾಸಿಸುತ್ತಿದ್ದೀರಿ?" }
    }
  },
  {
    id: 'naviksa-q4',
    survey_id: DEMO_SURVEY_ID,
    order: 4,
    type: 'single_choice',
    required: true,
    translations: {
      en: {
        text: "Which of the following best describes your vision?",
        options: [
          { id: 'blind', translations: { en: "Blind", hi: "दृष्टिहीन", hinglish: "Blind", mr: "दृष्टिहीन", te: "దృష్టి లోపం (పూర్తిగా)", ta: "பார்வை இல்லாதவர்", kn: "ದೃಷ್ಟಿಹೀನರು (ಸಂಪೂರ್ಣವಾಗಿ)" } },
          { id: 'low_vision', translations: { en: "Low Vision", hi: "कम दृष्टि", hinglish: "Low Vision", mr: "कमी दृष्टी", te: "స్వల్ప దృష్టి లోపం", ta: "குறைந்த பார்வை", kn: "ಕಡಿಮೆ ದೃಷ್ಟಿ" } },
          { id: 'partial_impairment', translations: { en: "Partial Vision Impairment", hi: "आंशिक दृष्टि दोष", hinglish: "Partial Vision Impairment", mr: "आंशिक दृष्टीदोष", te: "పాక్షిక దృష్టి లోపం", ta: "பகுதி பார்வை குறைபாடு", kn: "ಭಾಗಶಃ ದೃಷ್ಟಿ ದೋಷ" } },
          { id: 'custom_description', translations: { en: "Prefer to describe in my own words", hi: "अपने शब्दों में वर्णन करना चाहते हैं", hinglish: "Apne words me describe karna chahenge", mr: "माझ्या स्वतःच्या शब्दात वर्णन करू इच्छितो", te: "నా స్వంత మాటల్లో వివరించడానికి ఇష్టపడుతున్నాను", ta: "என் சொந்த வார்த்தைகளில் விவரிக்க விரும்புகிறேன்", kn: "ನನ್ನ ಸ್ವಂತ ಮಾತುಗಳಲ್ಲಿ ವಿವರಿಸಲು ಬಯಸುತ್ತೇನೆ" } }
        ] as any
      },
      hi: { text: "निम्नलिखित में से कौन सा आपकी दृष्टि का सबसे अच्छा वर्णन करता है?" },
      hinglish: { text: "Inme se kya aapki vision (nazar) ko best describe karta hai?" },
      mr: { text: "खालीलपैकी कोणते तुमच्या दृष्टीचे उत्तम वर्णन करते?" },
      te: { text: "క్రింది వాటిలో ఏది మీ దృష్టిని ఉత్తమంగా వివరిస్తుంది?" },
      ta: { text: "பின்வருவனவற்றில் எது உங்கள் பார்வையைச் சிறப்பாக விவரிக்கிறது?" },
      kn: { text: "ಕೆಳಗಿನವುಗಳಲ್ಲಿ ಯಾವುದು ನಿಮ್ಮ ದೃಷ್ಟಿಯನ್ನು ಅತ್ಯುತ್ತಮವಾಗಿ ವಿವರಿಸುತ್ತದೆ?" }
    }
  },
  {
    id: 'naviksa-q4-followup',
    survey_id: DEMO_SURVEY_ID,
    order: 5,
    type: 'paragraph_short',
    required: true,
    followUpFor: 'naviksa-q4',
    skipCondition: 'skip_if_not_custom_description',
    translations: {
      en: { text: "Please describe your vision in a way you are comfortable with." },
      hi: { text: "कृपया अपनी दृष्टि का इस तरह वर्णन करें जिससे आप सहज महसूस करें।" },
      hinglish: { text: "Please apni vision ko aise words me describe karein jisme aap comfortable hon." },
      mr: { text: "कृपया तुमच्या दृष्टीचे तुम्हाला सोयीस्कर वाटेल अशा पद्धतीने वर्णन करा." },
      te: { text: "దయచేసి మీ దృష్టిని మీకు అనుకూలమైన రీతిలో వివరించండి." },
      ta: { text: "தயவுசெய்து உங்கள் பார்வையை உங்களுக்கு வசதியான முறையில் விவரிக்கவும்." },
      kn: { text: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ದೃಷ್ಟಿಯನ್ನು ನಿಮಗೆ ಅನುಕೂಲಕರವಾದ ರೀತಿಯಲ್ಲಿ ವಿವರಿಸಿ." }
    }
  },
  {
    id: 'naviksa-q5',
    survey_id: DEMO_SURVEY_ID,
    order: 6,
    type: 'yes_no',
    required: true,
    translations: {
      en: {
        text: "Do you currently use any accessibility tools or assistive technologies in your daily life? Examples include screen readers, magnifiers, voice assistants, navigation tools, or accessibility features on a phone.",
        options: [
          { id: 'yes', translations: { en: "Yes", hi: "हाँ", hinglish: "Haan", mr: "होय", te: "అవును", ta: "ஆம்", kn: "ಹೌದು" } },
          { id: 'no', translations: { en: "No", hi: "नहीं", hinglish: "Nahi", mr: "नाही", te: "కాదు", ta: "இல்லை", kn: "ಇಲ್ಲ" } }
        ] as any
      },
      hi: { text: "क्या आप वर्तमान में अपने दैनिक जीवन में किसी एक्सेसिबिलिटी टूल या सहायक तकनीकों का उपयोग करते हैं? उदाहरणों में स्क्रीन रीडर, मैग्नीफायर, वॉयस असिस्टेंट, नेविगेशन टूल या फोन पर एक्सेसिबिलिटी फीचर शामिल हैं।" },
      hinglish: { text: "Kya aap abhi apni daily life me koi accessibility tools ya assistive technologies use karte hain? Jaise screen readers, magnifiers, voice assistants, navigation tools, ya phone ke accessibility features." },
      mr: { text: "तुम्ही सध्या तुमच्या दैनंदिन जीवनात कोणतीही प्रवेशयोग्यता साधने किंवा सहायक तंत्रज्ञान वापरता का? उदाहरणांमध्ये स्क्रीन रीडर, मॅग्निफायर, व्हॉइस असिस्टंट, नेव्हिगेशन साधने किंवा फोनवरील प्रवेशयोग्यता वैशिष्ट्ये समाविष्ट आहेत।" },
      te: { text: "మీరు ప్రస్తుతం మీ దైనందిన జీవితంలో ఏవైనా ప్రాప్యత సాధనాలు లేదా సహాయక సాంకేతికతలను ఉపయోగిస్తున్నారా? ఉదాహరణలలో స్క్రీన్ రీడర్‌లు, మాగ్నిఫైయర్‌లు, వాయిస్ అసిస్టెంట్‌లు, నావిగేషన్ సాధనాలు లేదా ఫోన్‌లోని ప్రాప್ಯత లక్షణాలు ఉన్నాయి।" },
      ta: { text: "உங்கள் அன்றாட வாழ்க்கையில் ஏதேனும் அணுகல் கருவிகள் அல்லது உதவி தொழில்நுட்பங்களைப் பயன்படுத்துகிறீர்களா? ஸ்கிரீன் ரீடர்கள், உருப்பெருக்கிகள், குரல் உதவியாளர்கள், வழிசெலுத்தல் கருவிகள் அல்லது தொலைபேசியில் உள்ள அணுகல் அம்சங்கள் போன்றவை।" },
      kn: { text: "ನೀವು ಪ್ರಸ್ತುತ ನಿಮ್ಮ ದೈನಂದಿನ ಜೀವನದಲ್ಲಿ ಯಾವುದೇ ಪ್ರವೇಶದ ಪರಿಕರಗಳು ಅಥವಾ ಸಹಾಯಕ ತಂತ್ರಜ್ಞಾನಗಳನ್ನು ಬಳಸುತ್ತೀರಾ? ಉದಾಹರಣೆಗೆ ಸ್ಕ್ರೀನ್ ರೀಡರ್, ಮ್ಯಾಗ್ನಿಫೈಯರ್, ವಾಯ್ಸ್ ಅಸಿಸ್ಟೆಂಟ್, ನ್ಯಾವಿಗೇಷನ್ ಟೂಲ್ ಅಥವಾ ಫೋನ್‌ನಲ್ಲಿನ ಪ್ರವೇಶದ ಫೀಚರ್‌ಗಳು।" }
    }
  },
  {
    id: 'naviksa-q6',
    survey_id: DEMO_SURVEY_ID,
    order: 7,
    type: 'paragraph',
    required: true,
    skipCondition: 'skip_if_q5_no',
    translations: {
      en: { text: "Which accessibility tools, applications, or technologies do you use most often?" },
      hi: { text: "आप अक्सर किन एक्सेसिबिलिटी टूल, एप्लिकेशन या तकनीकों का उपयोग करते हैं?" },
      hinglish: { text: "Aap kaun se accessibility tools, applications, ya technologies sabse zyada use karte hain?" },
      mr: { text: "तुम्ही कोणती प्रवेशयोग्यता साधने, ॲप्लिकेशन्स किंवा तंत्रज्ञान सर्वात जास्त वापरता?" },
      te: { text: "మీరు ఎక్కువగా ఏ ప్రాప್ಯత సాధనాలు, అప్లికేషన్లు లేదా సాంకేతికతలను ఉపయోగిస్తున్నారు?" },
      ta: { text: "எந்த அணுகல் கருவிகள், பயன்பாடுகள் அல்லது தொழில்நுட்பங்களை நீங்கள் அடிக்கடி பயன்படுத்துகிறீர்கள்?" },
      kn: { text: "ನೀವು ಯಾವ ಪ್ರವೇಶದ ಪರಿಕರಗಳು, ಅಪ್ಲಿಕೇಶನ್‌ಗಳು ಅಥವಾ ತಂತ್ರಜ್ಞಾನಗಳನ್ನು ಹೆಚ್ಚಾಗಿ ಬಳಸುತ್ತೀರಿ?" }
    }
  },
  {
    id: 'naviksa-q7',
    survey_id: DEMO_SURVEY_ID,
    order: 8,
    type: 'paragraph',
    required: true,
    skipCondition: 'skip_if_q5_no',
    translations: {
      en: { text: "What do you find most helpful about the accessibility tools or technologies you currently use?" },
      hi: { text: "आप वर्तमान में जिन एक्सेसिबिलिटी टूल या तकनीकों का उपयोग करते हैं, उनके बारे में आपको सबसे उपयोगी क्या लगता है?" },
      hinglish: { text: "Aapko in accessibility tools ya technologies me sabse zyada kya helpful lagta hai?" },
      mr: { text: "तुम्ही सध्या वापरत असलेल्या प्रवेशयोग्यता साधनांबद्दल किंवा तंत्रज्ञानाबद्दल तुम्हाला सर्वात उपयुक्त काय वाटते?" },
      te: { text: "మీరు ప్రస్తుతం ఉపయోగిస్తున్న ప్రాప్యత సాధనాలు లేదా సాంకేతికతలలో మీకు అత్యంత సహాయకారిగా అనిపించింది ఏమిటి?" },
      ta: { text: "நீங்கள் தற்போது பயன்படுத்தும் அணுகல் கருவிகள் அல்லது தொழில்நுட்பங்களில் எது உங்களுக்கு மிகவும் உதவியாக இருக்கிறது?" },
      kn: { text: "ನೀವು ಪ್ರಸ್ತುತ ಬಳಸುತ್ತಿರುವ ಪ್ರವೇಶದ ಪರಿಕರಗಳು ಅಥವಾ ತಂತ್ರಜ್ಞಾನಗಳ ಬಗ್ಗೆ ನಿಮಗೆ ಅತ್ಯಂತ ಉಪಯುಕ್ತವೆनಿಸಿದ್ದು ಯಾವುದು?" }
    }
  },
  {
    id: 'naviksa-q8',
    survey_id: DEMO_SURVEY_ID,
    order: 9,
    type: 'single_choice',
    required: true,
    translations: {
      en: {
        text: "Are there situations where current accessibility technologies do not fully meet your needs?",
        options: [
          { id: 'yes', translations: { en: "Yes", hi: "हाँ", hinglish: "Haan", mr: "होय", te: "అవును", ta: "ஆம்", kn: "ಹೌದು" } },
          { id: 'no', translations: { en: "No", hi: "नहीं", hinglish: "Nahi", mr: "नाही", te: "కాదు", ta: "இல்லை", kn: "ಇಲ್ಲ" } },
          { id: 'not_sure', translations: { en: "Not Sure", hi: "पक्का नहीं", hinglish: "Sure nahi hain", mr: "खात्री नाही", te: "ఖచ్చితంగా తెలియదు", ta: "நிச்சயமில்லை", kn: "ಖಚಿತವಿಲ್ಲ" } }
        ] as any
      },
      hi: { text: "क्या ऐसी स्थितियां हैं जहां वर्तमान एक्सेसिबिलिटी तकनीकें आपकी आवश्यकताओं को पूरी तरह से पूरा नहीं करती हैं?" },
      hinglish: { text: "Kya koi aisi situations hain jahan current accessibility technologies aapki needs ko poora nahi karti hain?" },
      mr: { text: "अशा परिस्थिती आहेत का जिथे वर्तमान प्रवेशयोग्यता तंत्रज्ञान तुमच्या गरजा पूर्णपणे पूर्ण करत नाही?" },
      te: { text: "ప్రస్తుత ప్రాప్యత సాంకేతికతలు మీ అవసరాలను పూర్తిగా తీర్చలేని పరిస్థితులు ఉన్నాయా?" },
      ta: { text: "தற்போதைய அணுகல் தொழில்நுட்பங்கள் உங்கள் தேவைகளை முழுமையாகப் பூர்த்தி செய்யாத சூழ்நிலைகள் உள்ளதா?" },
      kn: { text: "ಪ್ರಸ್ತುತ ಪ್ರವೇಶದ ತಂತ್ರಜ್ಞಾನಗಳು ನಿಮ್ಮ ಅಗತ್ಯಗಳನ್ನು ಸಂಪೂರ್ಣವಾಗಿ ಪೂರೈಸದ ಸಂದರ್ಭಗಳು ಇವೆಯೇ?" }
    }
  },
  {
    id: 'naviksa-q9',
    survey_id: DEMO_SURVEY_ID,
    order: 10,
    type: 'paragraph',
    required: true,
    skipCondition: 'skip_if_not_q8_yes',
    translations: {
      en: { text: "Can you describe any challenges, frustrations, or limitations you experience when using existing accessibility technologies?" },
      hi: { text: "क्या आप मौजूदा एक्सेसिबिलिटी तकनीकों का उपयोग करते समय आने वाली चुनौतियों, कुंठाओं या सीमाओं का वर्णन कर सकते हैं?" },
      hinglish: { text: "Kya aap un challenges, frustrations, ya limitations ke baare me batayenge jo aapko in technologies ko use karte waqt aate hain?" },
      mr: { text: "सध्याचे प्रवेशयोग्यता तंत्रज्ञान वापरताना तुम्हाला येणाऱ्या अडचणी, निराशा किंवा मर्यादांचे तुम्ही वर्णन करू शकता का?" },
      te: { text: "ప్రస్తుత ప్రాప్యత సాంకేతికతలను ఉపయోగిస్తున్నప్పుడు మీరు ఎదుర్కొంటున్న సవాళ్లు, నిరాశలు లేదా పరిమితులను మీరు వివరించగలరా?" },
      ta: { text: "தற்போதுள்ள அணுகல் தொழில்நுட்பங்களைப் பயன்படுத்தும்போது நீங்கள் சந்திக்கும் சவால்கள், ஏமாற்றங்கள் அல்லது வரம்புகளை விவரிக்க முடியுமா?" },
      kn: { text: "ಪ್ರಸ್ತುತ ಪ್ರವೇಶದ ತಂತ್ರಜ್ಞಾನಗಳನ್ನು ಬಳಸುವಾಗ ನೀವು ಎದುರಿಸುತ್ತಿರುವ ಸವಾಲುಗಳು, ಹತಾಶೆಗಳು ಅಥವಾ ಮಿತಿಗಳನ್ನು ವಿವರಿಸಬಹುದೇ?" }
    }
  },
  {
    id: 'naviksa-q10',
    survey_id: DEMO_SURVEY_ID,
    order: 11,
    type: 'paragraph',
    required: true,
    translations: {
      en: { text: "Think about a challenge you face in your daily life. What technology, feature, or improvement would help you overcome that challenge?" },
      hi: { text: "अपने दैनिक जीवन में आने वाली किसी चुनौती के बारे में सोचें। उस चुनौती से उबरने में कौन सी तकनीक, विशेषता या सुधार आपकी मदद करेगा?" },
      hinglish: { text: "Apni daily life ke kisi challenge ke baare me sochein. Kaun si technology, feature, ya improvement aapko us challenge se bahar nikalne me help karegi?" },
      mr: { text: "तुमच्या दैनंदिन जीवनातील एका आव्हानाचा विचार करा. ते आव्हान पार पाडण्यासाठी कोणते तंत्रज्ञान, वैशिष्ट्य किंवा सुधारणा तुम्हाला मदत करेल?" },
      te: { text: "మీ దైనందిన జీవితంలో ఎదుర్కొనే ఒక సవాలు గురించి ఆలోచించండి. ఆ సవాలును అధిగమించడానికి ఏ సాంకేతికత, లక్షణం లేదా మెరుగుదల మీకు సహాయపడుతుంది?" },
      ta: { text: "உங்கள் அன்றாட வாழ்க்கையில் நீங்கள் எதிர்கொள்ளும் சவாலைப் பற்றி சிந்தியுங்கள். அந்த சவாலை சமாளிக்க எந்த தொழில்நுட்பம், அம்சம் அல்லது முன்னேற்றம் உங்களுக்கு உதவும்?" },
      kn: { text: "ನಿಮ್ಮ ದೈನಂದಿನ ಜೀವನದಲ್ಲಿ ನೀವು ಎದುರಿಸುತ್ತಿರುವ ಸವಾಲನ್ನು ಯೋಚಿಸಿ. ಆ ಸವಾಲನ್ನು ಜಯಿಸಲು ಯಾವ ತಂತ್ರಜ್ಞಾನ, ಫೀಚರ್ ಅಥವಾ ಸುಧಾರಣೆ ನಿಮಗೆ ಸಹಾಯ ಮಾಡುತ್ತದೆ?" }
    }
  }
]

export async function seedLocalData(): Promise<void> {
  // Always seed to keep it fresh
  await db.surveys.put(demoSurvey)
  await db.questions.bulkPut(demoQuestions)
}
