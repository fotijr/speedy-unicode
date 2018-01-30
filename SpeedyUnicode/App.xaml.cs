using System;
using System.Windows;

namespace SpeedyUnicode
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        public App()
        {
            AppDomain.CurrentDomain.UnhandledException += UnhandledExceptionCatch;
        }

        static void UnhandledExceptionCatch(object sender, UnhandledExceptionEventArgs e)
        {
            MessageBox.Show("Fatal Speedy Unicode Error" + Environment.NewLine + Environment.NewLine + e.ExceptionObject.ToString(), "Fatal Error 💀", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }
}
