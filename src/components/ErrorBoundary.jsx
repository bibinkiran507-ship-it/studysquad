import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[StudySquad ErrorBoundary]', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#e9ebe6] flex items-center justify-center p-6 font-sans text-slate-900">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Quick Study Room Refresh Needed
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Something unexpected interrupted this view. Your account, study squads, notes, and Pro membership are completely safe.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-md transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload StudySquad</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
