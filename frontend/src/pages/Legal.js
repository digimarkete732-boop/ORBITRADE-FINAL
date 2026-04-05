import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, FileText, Scale, AlertTriangle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';

const LEGAL_CONTENT = {
  terms: {
    title: 'Terms of Service',
    icon: FileText,
    lastUpdated: 'January 1, 2026',
    sections: [
      {
        title: '1. Acceptance of Terms',
        content: `By accessing or using the ORBITRADE Trading Platform ("Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Platform. The Platform is operated by ORBITRADE Ltd. and provides binary options trading services for forex, cryptocurrencies, and precious metals.`
      },
      {
        title: '2. Eligibility',
        content: `You must be at least 18 years old and legally able to enter into contracts in your jurisdiction. Binary options trading may be restricted or prohibited in certain jurisdictions. It is your responsibility to ensure that your use of the Platform complies with applicable laws. We reserve the right to refuse service to anyone at our discretion.`
      },
      {
        title: '3. Account Registration',
        content: `To use the Platform, you must create an account with accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized access. One person may only maintain one account. Multiple accounts will be terminated.`
      },
      {
        title: '4. Trading Services',
        content: `The Platform offers binary options trading on various assets. All trades are final once placed and cannot be cancelled except as permitted by Platform rules. Payout rates are displayed before trade execution. We do not provide investment advice. All trading decisions are your sole responsibility.`
      },
      {
        title: '5. Deposits and Withdrawals',
        content: `Deposits are processed via cryptocurrency. Minimum deposit is $10 USD. Withdrawals require identity verification (KYC). Processing times vary by method. We reserve the right to request additional documentation. Bonus funds are subject to wagering requirements.`
      },
      {
        title: '6. Prohibited Activities',
        content: `You agree not to: use the Platform for money laundering or fraud; manipulate or attempt to manipulate trading outcomes; use automated trading bots without authorization; share your account with others; exploit any bugs or vulnerabilities; engage in collusion with other users.`
      },
      {
        title: '7. Limitation of Liability',
        content: `The Platform is provided "as is" without warranties. We are not liable for: trading losses; technical failures; market data inaccuracies; third-party actions; force majeure events. Our maximum liability is limited to the funds in your account.`
      },
      {
        title: '8. Termination',
        content: `We may suspend or terminate your account at any time for violation of these terms or any suspicious activity. Upon termination, you may withdraw available funds subject to verification. We reserve the right to withhold funds if fraud is suspected.`
      },
      {
        title: '9. Governing Law',
        content: `These terms are governed by international arbitration laws. Any disputes shall be resolved through binding arbitration. You waive the right to participate in class action lawsuits against the Platform.`
      },
      {
        title: '10. Contact',
        content: `For questions about these Terms, contact: support@orbitrade.live`
      }
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    icon: Shield,
    lastUpdated: 'January 1, 2026',
    sections: [
      {
        title: '1. Information We Collect',
        content: `We collect: Personal information (name, email, phone, address) provided during registration; Identity documents for KYC verification; Financial information including transaction history; Device information and IP addresses; Usage data and trading patterns; Communications with our support team.`
      },
      {
        title: '2. How We Use Your Information',
        content: `We use your information to: Provide and improve our services; Process transactions and withdrawals; Verify your identity (KYC/AML compliance); Communicate important updates; Detect and prevent fraud; Comply with legal obligations; Personalize your experience.`
      },
      {
        title: '3. Information Sharing',
        content: `We may share information with: Payment processors for transactions; Identity verification services; Law enforcement when legally required; Affiliated companies within our group; Service providers who assist our operations. We never sell your personal data to third parties.`
      },
      {
        title: '4. Data Security',
        content: `We implement industry-standard security measures including: SSL/TLS encryption for data transmission; Encrypted storage of sensitive data; Regular security audits; Access controls and authentication; DDoS protection and firewalls.`
      },
      {
        title: '5. Cookies and Tracking',
        content: `We use cookies for: Session management; Remembering preferences; Analytics and performance monitoring; Fraud detection. You can manage cookie preferences in your browser settings.`
      },
      {
        title: '6. Data Retention',
        content: `We retain your data for: Active accounts: duration of account plus 5 years; Closed accounts: minimum 5 years for regulatory compliance; Transaction records: 7 years minimum; KYC documents: as required by law.`
      },
      {
        title: '7. Your Rights',
        content: `You have the right to: Access your personal data; Request correction of inaccuracies; Request deletion (subject to legal requirements); Export your data; Opt-out of marketing communications; Lodge complaints with data protection authorities.`
      },
      {
        title: '8. International Transfers',
        content: `Your data may be transferred to servers in various countries. We ensure appropriate safeguards are in place for cross-border transfers in compliance with applicable data protection laws.`
      },
      {
        title: '9. Updates to Privacy Policy',
        content: `We may update this policy periodically. Significant changes will be communicated via email or platform notification. Continued use after changes constitutes acceptance.`
      },
      {
        title: '10. Contact',
        content: `Data Protection Officer: privacy@orbitrade.live`
      }
    ]
  },
  risk: {
    title: 'Risk Disclosure',
    icon: AlertTriangle,
    lastUpdated: 'January 1, 2026',
    sections: [
      {
        title: 'HIGH RISK WARNING',
        content: `BINARY OPTIONS TRADING INVOLVES SUBSTANTIAL RISK OF LOSS AND IS NOT SUITABLE FOR ALL INVESTORS. YOU SHOULD NOT TRADE WITH MONEY YOU CANNOT AFFORD TO LOSE. PAST PERFORMANCE IS NOT INDICATIVE OF FUTURE RESULTS.`
      },
      {
        title: '1. Nature of Binary Options',
        content: `Binary options are high-risk financial instruments where you predict whether an asset's price will rise or fall within a specific time frame. If your prediction is correct, you receive a predetermined payout. If incorrect, you lose your entire investment in that trade.`
      },
      {
        title: '2. Risk of Loss',
        content: `You can lose 100% of the money invested in a single trade. There is no guarantee of profit. The majority of retail traders lose money trading binary options. Only trade with funds you can afford to lose entirely without affecting your lifestyle.`
      },
      {
        title: '3. Market Volatility',
        content: `Financial markets are inherently volatile. Prices can change rapidly due to: Economic news and events; Political developments; Market sentiment; Liquidity conditions; Technical factors. This volatility increases both potential profits and losses.`
      },
      {
        title: '4. No Investment Advice',
        content: `ORBITRADE does not provide investment advice. AI predictions and market analysis are for informational purposes only and should not be considered recommendations. You are solely responsible for your trading decisions.`
      },
      {
        title: '5. Leverage and Margin',
        content: `While binary options don't use traditional leverage, the all-or-nothing nature means your full investment is at risk. Small market movements can result in complete loss of your position.`
      },
      {
        title: '6. Technical Risks',
        content: `Trading involves technical risks including: Internet connectivity issues; Platform outages; Data feed delays; System errors. We are not liable for losses due to technical failures beyond our control.`
      },
      {
        title: '7. Regulatory Status',
        content: `Binary options trading is regulated differently across jurisdictions. Some countries prohibit or restrict binary options. It is your responsibility to ensure compliance with local laws.`
      },
      {
        title: '8. Psychological Risks',
        content: `Trading can be emotionally challenging and may lead to: Overtrading; Chasing losses; Addiction-like behavior; Stress and anxiety. If you experience these issues, stop trading and seek help.`
      },
      {
        title: '9. Acknowledgment',
        content: `By using ORBITRADE, you acknowledge: You have read and understood these risks; You have sufficient knowledge and experience; You accept full responsibility for your decisions; You will not hold ORBITRADE liable for trading losses.`
      },
      {
        title: '10. Seek Professional Advice',
        content: `Before trading, consider consulting a licensed financial advisor who can assess your personal circumstances and risk tolerance. Never trade based solely on platform information.`
      }
    ]
  }
};

const Legal = () => {
  const navigate = useNavigate();
  const { type } = useParams();
  const content = LEGAL_CONTENT[type] || LEGAL_CONTENT.terms;
  const Icon = content.icon;

  return (
    <div className="min-h-screen bg-[#080c14]">
      <Navbar />
      <main className="pt-16 pb-12 px-4 sm:px-6 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-white mb-6 mt-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${type === 'risk' ? 'bg-amber-500/10' : 'bg-electric/10'}`}>
                <Icon className={`w-6 h-6 ${type === 'risk' ? 'text-amber-400' : 'text-electric'}`} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{content.title}</h1>
                <p className="text-xs text-gray-500">Last updated: {content.lastUpdated}</p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {content.sections.map((section, idx) => (
                <div key={idx} className={section.title === 'HIGH RISK WARNING' ? 'p-4 rounded-xl bg-red-500/10 border border-red-500/20' : ''}>
                  <h2 className={`text-sm font-bold mb-2 ${section.title === 'HIGH RISK WARNING' ? 'text-red-400' : 'text-white'}`}>
                    {section.title}
                  </h2>
                  <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">{section.content}</p>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] bg-black/20">
              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                <a href="/legal/terms" className="hover:text-electric">Terms of Service</a>
                <a href="/legal/privacy" className="hover:text-electric">Privacy Policy</a>
                <a href="/legal/risk" className="hover:text-electric">Risk Disclosure</a>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Legal;
