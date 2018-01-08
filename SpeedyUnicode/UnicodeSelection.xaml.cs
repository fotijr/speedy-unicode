using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace SpeedyUnicode
{
    /// <summary>
    /// Controls & interaction for UnicodeSelection window
    /// </summary>
    public partial class UnicodeSelection : Window
    {
        private string lastSearch = "INITIAL";
        private List<UnicodeCharacter> characters = new List<UnicodeCharacter>();
        private List<UnicodeCharacter> filteredCharacters = new List<UnicodeCharacter>();
        KeyboardHook hook = new KeyboardHook();

        public UnicodeSelection()
        {
            InitializeComponent();
            Task.Run(() => LoadCharacters());
            hook.KeyPressed += new EventHandler<KeyPressedEventArgs>(SpeedyShortcut_KeyPressed);
            // register the control + alt + F12 combination as hot key
            hook.RegisterHotKey(SpeedyUnicode.ModifierKeys.Control | SpeedyUnicode.ModifierKeys.Shift, System.Windows.Forms.Keys.X);
            SearchText.Focus();
        }

        void SpeedyShortcut_KeyPressed(object sender, KeyPressedEventArgs e)
        {
            this.Show();
        }

        private void SearchText_KeyUp(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                CopyUnicdoe();
            }
            else if (e.Key == Key.Escape)
            {
                this.Hide();
            }
            else
            {
                SearchUnicode();
            }
        }

        private void SearchText_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Up)
            {
                e.Handled = true;
                MoveSelection(-1);
            }
            else if (e.Key == Key.Down)
            {
                e.Handled = true;
                MoveSelection(1);
            }
        }

        private void SearchUnicode()
        {
            var searchTerm = SearchText.Text;
            if (lastSearch == searchTerm) return;
            lastSearch = searchTerm;

            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                filteredCharacters = characters.Where(c => c.LastSelected > DateTime.MinValue).ToList();
            }
            else
            {
                filteredCharacters = characters.Where(c => c.Name.IndexOf(searchTerm, StringComparison.CurrentCultureIgnoreCase) >= 0).ToList();
                foreach (var character in filteredCharacters)
                {
                    var remaining = character.Name.ToUpper().Replace(searchTerm.ToUpper(), "");
                    character.FilterAccuracy = remaining.Length;
                    if (remaining == "") continue;

                    if (character.Name == "POUTING CAT FACE")
                    {
                        Console.WriteLine("Ok");
                    }

                    if (remaining.IndexOf("  ", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        remaining.First() == ' ' ||
                        remaining.Last() == ' ')
                    {
                        // whole word in unicode name matched exact search term
                        character.FilterAccuracy = 1;
                    }
                }
            }
            
            UnicodeListView.ItemsSource = filteredCharacters.OrderByDescending(u => u.LastSelected).ThenBy(u => u.FilterAccuracy);
            UnicodeListView.SelectedIndex = 0;
        }

        private void CopyUnicdoe()
        {
            if (UnicodeListView.SelectedItem == null) return;
            var selected = (UnicodeCharacter)UnicodeListView.SelectedItem;
            selected.LastSelected = DateTime.Now;
            Clipboard.SetText(selected.ToString());
            this.Hide();
            ShowMessage(selected.ToString() + " copied");
        }

        private void ShowMessage(string message)
        {
            Console.WriteLine(message);
            //Task.Run(async () =>
            //{
            //    var display = new frmSplashMessage(message);
            //    display.Show();
            //    await Task.Delay(1000).ConfigureAwait(false);
            //    display.Close();
            //    //FadeOut(display);
            //}).ConfigureAwait(false);
        }

        private async Task<bool> LoadCharacters()
        {
            using (StreamReader sr = new StreamReader("UnicodeData.txt"))
            {
                try
                {
                    string line;
                    string[] properties;
                    while (sr.Peek() >= 0)
                    {
                        line = await sr.ReadLineAsync();
                        properties = line.Split(';');
                        characters.Add(new UnicodeCharacter
                        {
                            Number = properties[0],
                            Name = properties[1],
                            LastSelected = DateTime.MinValue
                        });
                    }

                    this.Dispatcher.Invoke(() =>
                    {
                        SearchUnicode();
                    });
                }
                catch (Exception ex)
                {
                    throw;
                }

            }
            return true;
        }

        private void UnicodeListView_PreviewMouseLeftButtonUp(object sender, MouseButtonEventArgs e)
        {
            CopyUnicdoe();
        }

        private void MoveSelection(int adjustRow)
        {
            if (UnicodeListView.SelectedItem == null) return;
            var currentSelectionIndex = UnicodeListView.SelectedIndex;
            var newSelectionIndex = (currentSelectionIndex + adjustRow);
            if (newSelectionIndex < 0 || newSelectionIndex > UnicodeListView.Items.Count - 1) return;
            UnicodeListView.SelectedIndex = newSelectionIndex;
        }

        private void Window_IsVisibleChanged(object sender, DependencyPropertyChangedEventArgs e)
        {
            SearchText.Focus();
            SearchText.SelectAll();
        }
    }
}
