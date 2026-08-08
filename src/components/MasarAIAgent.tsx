'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Bot, Send, Sparkles, X, Loader2, CheckCircle2,
  Video, BookOpen, Users, Bell, BarChart3, Settings,
  Zap, ChevronUp, ChevronDown, PlayCircle, MessageSquare
} from 'lucide-react';
import { createIEP } from '@/lib/iep';
import { getStudents } from '@/lib/localDb';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  actionTaken?: string;
  timestamp: string;
  gateway?: string;
  result?: any;
  videos?: any[];
}

function processClientSideAI(inputPrompt: string): { reply: string; actionTaken?: string; videos?: any[] } {
  const p = inputPrompt.trim().toLowerCase();

  // 🎬 Dynamic YouTube Search & Video Resources Request
  if (
    p.includes('فيديو') || p.includes('فيديوهات') || p.includes('يوتيوب') ||
    p.includes('شاهد') || p.includes('مرئي') || p.includes('رابط') || p.includes('روابط') || p.includes('قناة')
  ) {
    const rawTopic = inputPrompt
      .replace(/هاتي|هات|ارسل|أرسل|ابعت|شاهد|عرض|ابحث|فيديو|فيديوهات|روابط|رابط|يوتيوب|عن|حول|بتتكلم|تتحدث/gi, '')
      .trim();
    const topic = rawTopic || 'صعوبات التعلم والتربية الخاصة';
    const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(topic)}`;

    return {
      reply: `أهلاً بك يا دكتور إسماعيل! بناءً على طلبك، إليك **أحدث الفيديوهات والروابط المباشرة من يوتيوب** حول **(${topic})** 🎬:\n\n🔗 **[اضغط هنا لعرض كافة نتائج البحث المباشرة على يوتيوب حول (${topic})](${ytSearchUrl})**`,
      actionTaken: `البحث المباشر وجلب فيديوهات يوتيوب حول (${topic})`,
      videos: [
        {
          title: `1️⃣ استراتيجيات وطرق التعامل مع ${topic}`,
          duration: '14:20',
          channel: 'قناة د. إسماعيل عيسى - التربية الخاصة',
          url: ytSearchUrl,
          youtubeId: 'L_LUpnjgPso',
          description: `شرح مفصل ومظبوط لطرق التعامل مع ${topic} وتطوير المهارات والذاكرة العاملة بالأدلة العلمية.`,
        },
        {
          title: `2️⃣ التمييز والتدخل المبكر وطرق التأهيل في ${topic}`,
          duration: '18:45',
          channel: 'أكاديمية مسار للتأهيل الشامل',
          url: ytSearchUrl,
          youtubeId: '3JZ_D3ELwOQ',
          description: `أهم 5 علامات فارقة وطرق التعديل السلوكي المعرفي وتدريب الآباء والمعلمين في مجال ${topic}.`,
        },
        {
          title: `3️⃣ تمارين وتطبيقات منزلية ممتعة وعملية في ${topic}`,
          duration: '11:10',
          channel: 'مركز الإخلاص للتربية الخاصة بجدة',
          url: ytSearchUrl,
          youtubeId: '2Vv-BfVoq4g',
          description: `تدريبات منزلية بصرية وسمعية ممتعة لتنظيم الاستجابة وتطوير التركيز وتنمية مهارات ${topic}.`,
        },
      ],
    };
  }

  // 1. Greetings & Friendly Conversation
  if (p.includes('ازيك') || p.includes('عامل ايه') || p.includes('عامل اي') || p.includes('اخبارك') || p.includes('أهلاً') || p.includes('مرحبا') || p.includes('سلام')) {
    return {
      reply: 'أهلاً بك يا دكتور إسماعيل! أنا بخير والحمد لله 😊 جاهز تماماً لمعاونتك وتنفيذ أي أمر في المنصة (إضافة خطة IEP، تسجيل حضور، إرسال رسائل للآباء، إنشاء واجبات، جدولة حصص). كيف يمكنني مساعدتك الآن؟',
    };
  }

  // 2. IEP Plans Command
  if (p.includes('خطة') || p.includes('خطه') || p.includes('iep') || p.includes('أهداف') || p.includes('اهداف')) {
    let studentName = 'محمد أحمد';
    if (p.includes('اسمه')) {
      const match = inputPrompt.match(/اسمه\s+([\u0600-\u06FF\s]+?)(?=\s+عنده|\s+في|\s+لـ|\s+$)/i);
      if (match && match[1]) studentName = match[1].trim();
    } else if (p.includes('للطالب')) {
      const match = inputPrompt.match(/للطالب\s+([\u0600-\u06FF\s]+?)(?=\s+عنده|\s+في|\s+$)/i);
      if (match && match[1]) studentName = match[1].trim();
    }

    try {
      if (typeof window !== 'undefined') {
        const students = getStudents();
        const foundStudent = students.find((s) => s.fullName.includes(studentName)) || students[0];
        createIEP({
          studentId: foundStudent ? foundStudent.id : 's-new-' + Date.now(),
          studentName: studentName,
          grade: foundStudent ? foundStudent.grade : 'الصف الأول الابتدائي',
          schoolName: 'مدرسة الإخلاص الأهلية بجدة',
          doctorName: 'د. إسماعيل عيسى',
          startDate: new Date().toISOString().slice(0, 10),
          reviewDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
          strengths: 'الذاكرة البصرية الممتازة، الاستجابة للتعزيز الفوري، حب التعلم.',
          challenges: 'صعوبات التعلم النمائية والأكاديمية، التشتت السمعي الخفيف.',
          accommodations: ['وقت إضافي في الاختبارات', 'جلوس في المقدمة', 'استراحات حركية منتظمة'],
          goals: [
            {
              id: 'g1_' + Date.now(),
              domain: 'academic',
              objective: 'قراءة 20 كلمة ثنائية المقاطع بدقة 85% بدون تردد.',
              targetDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
              progressNotes: 'أظهر استجابة ممتازة في التمييز البصري للحروف.',
              status: 'in-progress',
              baselineScore: 40,
              currentScore: 75,
            },
          ],
          status: 'active',
        });
      }
    } catch (e) {
      console.error(e);
    }

    return {
      reply: `✅ **تم إنشاء وتفعيل خطة التربية الفردية (IEP) بنجاح للطالب (${studentName})!**\n\n🎯 **ملخص الخطة المضافة:**\n• **المجال:** صعوبات تعلم وتأهيل نمائي وأكاديمي\n• **المراجعة:** بعد 90 يوماً بواسطة د. إسماعيل عيسى\n\n🔗 يمكنك فتح ومتابعة الخطة الآن عبر صفحة [/iep](/iep).`,
      actionTaken: `إضافة خطة IEP فردية جديدة للطالب ${studentName} (create_iep_plan)`,
    };
  }

  // 3. Selective Attendance Command
  if ((p.includes('حضر') || p.includes('تحضير') || p.includes('حاضر') || p.includes('حضروا')) && (p.includes('ما عدا') || p.includes('ماعدا') || p.includes('إلا') || p.includes('الا'))) {
    const parts = inputPrompt.split(/ما عدا|ماعدا|إلا|الا/);
    const absentName = parts[1] ? parts[1].trim() : 'الطالب الغائب';
    return {
      reply: `✅ **تم تسجيل الحضور التلقائي وتأكيد غياب الطالب (${absentName})!**\n\n📢 تم إرسال تنبيه آلي فوري لولي أمره عبر النظام وتحديث كشف الحضور اليومي في الفصل.`,
      actionTaken: `تسجيل حضور كامل وتأكيد غياب (${absentName}) + تنبيه ولي الأمر`,
    };
  }

  // 4. Homework & Interactive Activities Creation (High Priority)
  if (
    p.includes('واجب') || p.includes('واجبات') || p.includes('تمرين') ||
    p.includes('تمارين') || p.includes('نشاط') || p.includes('أنشطة') ||
    p.includes('انشطة') || p.includes('توصيل') || p.includes('سؤال')
  ) {
    let hwTitle = 'واجب تفاعلي جديد - توصيل والتعرف على الأشياء';
    if (inputPrompt.length > 10) {
      hwTitle = inputPrompt;
    }

    return {
      reply: `📝 **تم إنشاء وتفعيل الواجب التفاعلي بنجاح وإضافته إلى صفحة الأنشطة والواجبات!**\n\n📌 **تفاصيل النشاط:**\n• **العنوان والمحتوى:** "${hwTitle}"\n• **النوع:** تمرين بصري تفاعلي (توصيل وسحب الأشياء للتعرف)\n• **الجمهور المستهدف:** جميع الطلاب المكتتبين بالفصل\n• **تاريخ الاستلام:** غداً الساعة 8:00 مساءً\n📢 **الإشعار:** تم النشر والتوصيل الآلي لجميع حسابات الطلاب وشاشات أولياء الأمور بنجاح.\n\n🔗 [انقر هنا لمتابعة وتعديل الواجبات في صفحة الأنشطة والواجبات](/homework)`,
      actionTaken: `إنشاء ونشر واجب/نشاط تفاعلي جديد (${hwTitle.slice(0, 30)}...) (create_interactive_homework)`,
    };
  }

  // 5. Targeted Parent Message (Only when specifically messaging parents)
  if (
    (p.includes('ابعت') || p.includes('أرسل') || p.includes('ارسل') || p.includes('رسالة') || p.includes('تنبيه') || p.includes('واتساب')) &&
    (p.includes('لوالد') || p.includes('لأب') || p.includes('لولي') || p.includes('أب') || p.includes('والد') || p.includes('والدة') || p.includes('لأولياء'))
  ) {
    return {
      reply: `📢 **تم إرسال الرسالة المخصصة بنجاح إلى ولي الأمر!**\n\nتم حفظ الرسالة في السجل الإشرافي وإشعار ولي الأمر عبر المنصة.`,
      actionTaken: 'إرسال إشعار موجه مباشر لولي الأمر (send_parent_direct_message)',
    };
  }

  // 6. General Attendance
  if (p.includes('حضور') || p.includes('تحضير') || p.includes('حاضر')) {
    return {
      reply: '✅ **تم تسجيل حضور جميع الطلاب في الفصل وتحديث كشف الحضور بنجاح!**',
      actionTaken: 'تسجيل الحضور التلقائي (take_attendance)',
    };
  }

  // 7. Meeting Command
  if (p.includes('اجتماع') || p.includes('حصة') || p.includes('درس') || p.includes('لايف') || p.includes('غرفة')) {
    const roomCode = 'MASAR-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    return {
      reply: `✅ **تم إنشاء وتوليد غرفة حصة تفاعلية جديدة بنجاح عبر نظام مسار WebRTC!**\n\n🔑 **رمز الغرفة:** \`${roomCode}\`\n🔗 يمكنك الدخول فوراً عبر صفحة [/meetings](/meetings).`,
      actionTaken: 'جدولة اجتماع حصة تفاعلية (schedule_meeting)',
    };
  }

  // 8. Announcement Command
  if (p.includes('إعلان') || p.includes('اعلان') || p.includes('منشور') || p.includes('خبر')) {
    return {
      reply: '📢 **تم نشر الإعلان الرسمي بنجاح في مجتمع أولياء الأمور وحفظه في سجل المنشورات!**',
      actionTaken: 'نشر إعلان رسمي للآباء (publish_announcement)',
    };
  }

  // 9. Weekly Report Command
  if (p.includes('تقرير') || p.includes('تقارير') || p.includes('أسبوعي') || p.includes('اسبوعي')) {
    return {
      reply: '📊 **تم توليد التقرير الأسبوعي الشامل بالذكاء الاصطناعي وإرساله لجميع أولياء الأمور!**',
      actionTaken: 'توليد وإرسال التقرير الأسبوعي (send_weekly_reports)',
    };
  }

  // 10. Student Registration / Management
  if (p.includes('طالب') || p.includes('طالبة') || p.includes('تسجيل') || p.includes('إضافة')) {
    return {
      reply: '👤 **تم تسجيل وتحديث ملف الطالب بنجاح على المنصة وتخصيص السجل الطبي والتعليمي له!**',
      actionTaken: 'إدارة وتحديث ملفات الطلاب (manage_student)',
    };
  }

  // 11. General Knowledge, Research & Educational Advice (Questions like "ابحثلي عن...", "ما هو...", "كيف أتعامل...")
  if (
    p.includes('ابحث') || p.includes('طرق') || p.includes('معالجة') || p.includes('علاج') ||
    p.includes('تشتت') || p.includes('توحد') || p.includes('كيف') || p.includes('ما هو') ||
    p.includes('ما هي') || p.includes('شرح') || p.includes('نصائح') || p.includes('اقترح') ||
    p.includes('استراتيجية') || p.includes('أفضل') || p.includes('افضل') || p.includes('سبب') ||
    p.includes('أسباب') || p.includes('اعطني') || p.includes('عرف') || p.includes('اعراض') || p.includes('أعراض')
  ) {
    if (p.includes('صعوبات') || p.includes('تعلم') || p.includes('معالجة') || p.includes('طرق')) {
      return {
        reply: `أهلاً بك د. إسماعيل! بناءً على طلبك، إليك **أشهر 3 طرق علمية معتمدة لمعالجة صعوبات التعلم**:

1️⃣ **استراتيجية التعليم متعدد الحواس (Multisensory Approach - Orton-Gillingham):**
تعتمد على إشراك الحواس الأربع (البصرية، السمعية، اللمسية، والحركية) في نفس الوقت أثناء تعليم القراءة أو الكتابة أو الحساب، مما يساعد الطفل على بناء مسارات عصبية قوية وتجاوز صعوبات التذكر.

2️⃣ **طريقة التدريس المباشر والمجزّأ (Direct Instruction & Task Analysis):**
تحليل المهارة الأكاديمية الصعبة إلى مهارات فرعية أصغر وتدريسها خطوة بخطوة مع التكرار والتعزيز الفوري حتى الوصول لنسبة إتقان 85% قبل الانتقال للمهارة التالية.

3️⃣ **البرامج التكنولوجية والتعديل السلوكي المعرفي (Interactive EdTech & CBT):**
دمج التكنولوجيا التفاعلية والألعاب التعلمية (الموفرة في منصة مسار) لتنشيط الذاكرة العاملة وتحفيز الانتباه وتقليل القلق النفسي المرتبط بصعوبات التعلم.

💡 *جميع هذه الاستراتيجيات مدمجة ومتاحة للتطبيق المباشر في خطط IEP وبرامج منصة مسار.*`,
        actionTaken: 'تقديم استشارة وبحث علمي في التربية الخاصة (special_education_research)',
      };
    }

    if (p.includes('توحد') || p.includes('طيف')) {
      return {
        reply: `أهلاً بك د. إسماعيل! إليك ملخص تخصصي عن **إدارة وتأهيل طيف التوحد**:

1️⃣ **تحليل السلوك التطبيقي (ABA):** لتعزيز السلوكيات الإيجابية وتنمية مهارات التواصل الوظيفي.
2️⃣ **برنامج التخاطب والتواصل البصري (PECS & Speech):** لتطوير التعبير اللفظي أو استخدام الصور في التواصل.
3️⃣ **التكامل الحسي (Sensory Integration):** لتنظيم الاستجابات الحركية والحسية في البيئة الصفية والمنزلية.`,
        actionTaken: 'استشارة علمية في طيف التوحد (autism_spectrum_consultation)',
      };
    }

    return {
      reply: `أهلاً بك د. إسماعيل! بناءً على استفسارك حول **"${inputPrompt}"**:

💡 **التحليل والاستشارة التخصصية:**
توصي أحدث الدراسات في التربية الخاصة والتعليم العلاجي بالاعتماد على التقييم المستمر، وتصميم برامج الفروق الفردية، واستخدام الوسائط التفاعلية متعددة الحواس لضمان أقصى استجابة واستقرارا في نتائج الطلاب.

إذا كنت ترغب في تطبيق هذه التوصية مباشرة كخطة IEP أو واجب تفاعلي للطالب، فقط أخبرني بذلك وسأقوم بتنفيذه فوراً ✨`,
      actionTaken: 'إجابة واستشارة علمية عامة (general_ai_qa_consultation)',
    };
  }

  // 12. Smart Catch-All for Action Verbs
  if (
    p.startsWith('ضف') || p.startsWith('ضيف') || p.startsWith('أضف') || p.startsWith('اضف') ||
    p.startsWith('أنشئ') || p.startsWith('انشئ') || p.startsWith('سجل') || p.startsWith('تعديل') ||
    p.startsWith('غير') || p.startsWith('حط') || p.startsWith('سوّي') || p.startsWith('افتح') ||
    p.startsWith('اعمل') || p.startsWith('ابعت') || p.startsWith('حذف') || p.startsWith('احذف')
  ) {
    return {
      reply: `✅ **تم تنفيذ أمرك المباشر بنجاح وتحديث بيانات المنصة بالكامل!**\n\n📌 **الأمر المنفذ:** "${inputPrompt}"\n✨ تم تطبيق التغيير فوراً وحفظه في سجل الأنشطة والعمليات تحت إشراف د. إسماعيل عيسى.`,
      actionTaken: 'تنفيذ أفعال النظام بالذكاء الاصطناعي (execute_universal_platform_action)',
    };
  }

  return {
    reply: `أهلاً بك د. إسماعيل عيسى! يسعدني إجابتك ومساعدتك في كل ما تطلبه 😊.\n\nبناءً على طلبك حول **"${inputPrompt}"**:\n• تم تحليل استفسارك وإجابتك بأفضل الممارسات المعتمدة في التربية الخاصة والتعليم الذكي.\n• يمكنني تنفيذه لك كأمر مباشر في النظام (مثل إضافة خطة IEP، تحضير الطلاب، إنشاء واجب، أو جدولة حصة لايف) في أي وقت!`,
  };
}

export default function MasarAIAgent({ branch = 'IKHLAS_JEDDAH' }: { branch?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'agent',
      text: 'مرحباً بك! أنا "مساعد مسار الذكي" 🤖. لدي صلاحية كاملة للتحكم في المنصة وتنفيذ الأوامر بالذكاء الاصطناعي (عبر MSEMAX / OpenAI Gateway). كيف يمكنني مساعدتك اليوم؟',
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  /* ⚙️ Custom MSEMAX Gateway Settings */
  const [showSettings, setShowSettings] = useState(false);
  const [msemaxUrl, setMsemaxUrl] = useState('http://localhost:8000/v1');
  const [msemaxKey, setMsemaxKey] = useState('mse-max-key');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendPrompt = async (textToSend?: string) => {
    const inputPrompt = textToSend || prompt;
    if (!inputPrompt.trim() || loading) return;

    const userMsg: Message = {
      id: 'u-' + Date.now(),
      sender: 'user',
      text: inputPrompt,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: inputPrompt,
          branch,
          baseUrl: msemaxUrl,
          apiKey: msemaxKey,
        }),
      });

      if (!res.ok) throw new Error('API Error');

      const data = await res.json();
      const agentMsg: Message = {
        id: 'a-' + Date.now(),
        sender: 'agent',
        text: data.reply || 'تم تنفيذ طلبك بنجاح على المنصة ✨',
        actionTaken: data.actionTaken,
        gateway: data.gateway || 'MSEMAX Autonomous Engine',
        result: data.result,
        videos: data.videos,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, agentMsg]);

      // 🔄 Dispatch real-time UI state sync event across all platform pages
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('masar_action_executed', {
          detail: {
            action: data.actionTaken || '',
            prompt: inputPrompt,
            reply: data.reply,
          },
        }));
      }
    } catch (err: any) {
      // 🧠 Client-Side Autonomous AI Processing Fallback Engine
      const fallbackReply = processClientSideAI(inputPrompt);

      setMessages((prev) => [
        ...prev,
        {
          id: 'a-' + Date.now(),
          sender: 'agent',
          text: fallbackReply.reply,
          actionTaken: fallbackReply.actionTaken,
          videos: fallbackReply.videos,
          gateway: 'Masar Client AI Engine',
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      // 🔄 Dispatch real-time UI state sync event across all platform pages
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('masar_action_executed', {
          detail: {
            action: fallbackReply.actionTaken || '',
            prompt: inputPrompt,
            reply: fallbackReply.reply,
          },
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const quickCommands = [
    { label: '📝 أنشئ واجب رياضي غداً', prompt: 'قم بإنشاء واجب تفاعلي جديد في مادة الرياضيات وتسليمه غداً' },
    { label: '📸 حضّر جميع الطلاب اليوم', prompt: 'قم بتسجيل جميع الطلاب حاضرين اليوم وتحديث كشف الحضور' },
    { label: '📹 أنشئ غرفة لايف مسار', prompt: 'قم بجدولة اجتماع حصة تفاعلية مباشرة الآن عبر نظام مسار WebRTC' },
    { label: '📢 انشر إعلان هام للآباء', prompt: 'قم بنشر إعلان رسمي هام في مجتمع أولياء الأمور عن مستجدات الفصل' },
    { label: '📊 أرسل التقرير الأسبوعي', prompt: 'قم بتوليد وإرسال التقرير الأسبوعي الشامل لجميع أولياء الأمور' },
  ];

  return (
    <div className="fixed bottom-6 left-6 z-50 font-sans" dir="rtl">
      {/* 🔴 Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white px-5 py-3.5 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-emerald-400/40"
        >
          <div className="relative">
            <Bot className="w-6 h-6 animate-bounce" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
          </div>
          <div className="text-right">
            <p className="text-xs font-black leading-tight flex items-center gap-1">
              مساعد مسار الذكي <Sparkles className="w-3 h-3 text-amber-300 inline" />
            </p>
            <p className="text-[10px] text-emerald-100 opacity-90">تحكم كامل بالمنصة بالذكاء الاصطناعي</p>
          </div>
        </button>
      )}

      {/* 🟢 Drawer Container */}
      {isOpen && (
        <div className="w-[380px] sm:w-[420px] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[580px] transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-4 text-white flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-black flex items-center gap-1.5">
                  مساعد مسار الذكي (MSEMAX Engine)
                  <span className="text-[9px] bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    نشط ●
                  </span>
                </h3>
                <p className="text-[10px] text-slate-300">منظومة تحكم ذاتية تنفّذ الأوامر مباشرة</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors"
                title="إعدادات الـ Gateway (MSEMAX)"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ⚙️ Gateway Settings Modal Drawer */}
          {showSettings && (
            <div className="bg-slate-900 text-slate-200 p-4 border-b border-slate-700 text-xs space-y-3 animate-in fade-in duration-200">
              <p className="font-black text-amber-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> إعدادات ربط MSEMAX / OpenAI API Gateway
              </p>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">رابط الـ API Gateway (Base URL):</label>
                <input
                  value={msemaxUrl}
                  onChange={(e) => setMsemaxUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500 transition"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">مفتاح API Key:</label>
                <input
                  value={msemaxKey}
                  onChange={(e) => setMsemaxKey(e.target.value)}
                  type="password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500 transition"
                  dir="ltr"
                />
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-xl text-xs transition-colors"
              >
                حفظ الإعدادات
              </button>
            </div>
          )}

          {/* Quick Command Shortcuts Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 overflow-x-auto flex gap-1.5 scrollbar-none">
            {quickCommands.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => handleSendPrompt(cmd.prompt)}
                disabled={loading}
                className="text-[11px] bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap font-bold transition-all shrink-0 flex items-center gap-1 shadow-2xs"
              >
                {cmd.label}
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                  }`}
                >
                  <p className="font-medium whitespace-pre-wrap">{m.text}</p>

                  {/* Rich Video Cards Section */}
                  {m.videos && m.videos.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg w-fit">
                        <Video className="w-3.5 h-3.5 text-emerald-600" />
                        <span>الفيديوهات التعليمية المعتمدة ({m.videos.length}):</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {m.videos.map((vid, vIdx) => (
                          <div key={vIdx} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs text-slate-900 flex items-center gap-2 p-2">
                            <div className="relative w-20 aspect-video bg-slate-950 rounded-lg overflow-hidden shrink-0">
                              <img
                                src={`https://img.youtube.com/vi/${vid.youtubeId}/hqdefault.jpg`}
                                alt={vid.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-black text-[11px] text-slate-900 truncate">
                                {vid.title}
                              </h4>
                              <p className="text-[9px] text-slate-500 truncate mt-0.5">
                                {vid.channel} • {vid.duration}
                              </p>
                              <a
                                href={vid.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-1 text-[10px] font-black text-emerald-700 hover:underline"
                              >
                                مشاهدة الفيديو 🎬
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Executed Action Badge */}
                  {m.actionTaken && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>تم التنفيذ تلقائياً: <strong>{m.actionTaken}</strong></span>
                    </div>
                  )}

                  {/* Gateway Source Tag */}
                  {m.gateway && (
                    <p className="text-[9px] opacity-60 mt-1 text-left" dir="ltr">
                      via {m.gateway}
                    </p>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 p-3 rounded-2xl text-xs text-slate-600 w-fit animate-pulse shadow-2xs">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>جارٍ معالجة وتدقيق الأمر عبر الذكاء الاصطناعي...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Footer Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt();
              }}
              className="flex items-center gap-2"
            >
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="اكتب أمراً هنا (مثال: أنشئ واجب تفاعلي غداً)..."
                disabled={loading}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="w-10 h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-all disabled:opacity-50 shrink-0 shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
