using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
// using System.Reflection;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

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
        System.Windows.Forms.NotifyIcon trayIcon = new System.Windows.Forms.NotifyIcon();

        public UnicodeSelection()
        {
            InitializeComponent();
            try
            {
                Task.Run(() => LoadCharacters());
                CreateTrayIcon();
                hook.KeyPressed += new EventHandler<KeyPressedEventArgs>(SpeedyShortcut_Engage);
                // register the control + alt + F12 combination as hot key
                hook.RegisterHotKey(ModifierKeys.Control | ModifierKeys.Shift, System.Windows.Forms.Keys.X);
                SearchText.Focus();
                TopDock.PreviewMouseLeftButtonDown += (s, e) =>
                {
                    if (e.Source is Button) return;
                    DragMove();
                };
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("hot key"))
            {
                MessageBox.Show("Error registering keyboard shortcut. Do you already have Speedy Unicode running?", "Error Registering Hot Key 😦", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error initializing Speedy Unicode. Please proceed to rage tweet your frustrations.", "Initialization Error 😦", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void CreateTrayIcon()
        {
            // getting the icon like this to avoid deploying a resource item or folder
            trayIcon.Icon = System.Drawing.Icon.ExtractAssociatedIcon(System.Reflection.Assembly.GetExecutingAssembly().Location);
            trayIcon.DoubleClick += SpeedyShortcut_Engage;
            trayIcon.Text = "Speedy Unicode 💨";
            trayIcon.Visible = true;
            
        }


        /// <summary>
        /// Event fires when Speedy Unicode is engaged, whether through the ⌨ shortcut or the system tray icon 💻
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e">Will be a KeyPressedEventArgs type if from the ⌨ shortcut</param>
        void SpeedyShortcut_Engage(object sender, EventArgs e)
        {
            this.Show();
            this.Activate();
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
                filteredCharacters = characters.Where(c => c.Name.IndexOf(searchTerm, StringComparison.CurrentCultureIgnoreCase) >= 0 ||
                                                           (c.Alias != null && c.Alias.IndexOf(searchTerm, StringComparison.CurrentCultureIgnoreCase) >= 0)).ToList();
                foreach (var character in filteredCharacters)
                {
                    var remaining = character.Name.ToUpper().Replace(searchTerm.ToUpper(), "");
                    character.FilterAccuracy = remaining.Length;
                    if (remaining == "") continue;

                    if (character.Name == "shrug")
                    {
                        Console.WriteLine("Ok");
                    }

                    if (remaining.IndexOf("  ", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        remaining.First() == ' ' ||
                        remaining.Last() == ' ')
                    {
                        // whole word in Unicode name matched exact search term
                        character.FilterAccuracy = 1;
                    }
                }
            }

            UnicodeListView.ItemsSource = filteredCharacters.OrderByDescending(u => u.LastSelected).ThenBy(u => u.FilterAccuracy);
            UnicodeListView.SelectedIndex = 0;
        }


        /// <summary>
        /// Copies unicode char(s) to clipboard and clears search box
        /// </summary>
        private void CopyUnicdoe()
        {
            if (UnicodeListView.SelectedItem == null) return;
            var selected = (UnicodeCharacter)UnicodeListView.SelectedItem;
            selected.LastSelected = DateTime.Now;
            Clipboard.SetText(selected.Value);
            this.Hide();
            ShowMessage(selected.Value + " copied");
            SearchText.Clear();
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
                    string charCode;
                    int uniInt;
                    while (sr.Peek() >= 0)
                    {
                        line = await sr.ReadLineAsync();
                        properties = line.Split(';');
                        charCode = properties[0];
                        uniInt = int.Parse(charCode, System.Globalization.NumberStyles.AllowHexSpecifier);

                        if (properties[2] == "Cs") continue;

                        characters.Add(new UnicodeCharacter
                        {
                            Number = charCode,
                            Name = properties[1],
                            LastSelected = DateTime.MinValue,
                            Value = char.ConvertFromUtf32(uniInt)
                        });
                    }

                    await LoadCustomValues();

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

        /// <summary>
        /// Load user-defined custom values
        /// </summary>
        private async Task LoadCustomValues()
        {
            var customCodeFile = "my.unicode.txt";
            if (!File.Exists(customCodeFile)) return;
            using (StreamReader sr = new StreamReader(customCodeFile))
            {
                try
                {
                    string line;
                    string[] properties;
                    while (sr.Peek() >= 0)
                    {
                        line = await sr.ReadLineAsync();
                        properties = line.Split(';');
                        var code = properties[0];
                        var alias = properties[3];

                        if (properties.Length < 3) continue;
                        if (code != "0")
                        {
                            // already existing Unicode, so set alias
                            var existingChar = characters.FirstOrDefault(c => c.Number == code);
                            if (existingChar != null)
                            {
                                existingChar.Alias = alias;
                            }
                            continue;
                        }

                        characters.Add(new UnicodeCharacter
                        {
                            Number = code,
                            Name = properties[1],
                            LastSelected = DateTime.MinValue,
                            Value = properties[2],
                            Alias = alias
                        });
                    }
                }
                catch (Exception ex)
                {
                    throw;
                }

            }
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

        private void HideButton_Click(object sender, RoutedEventArgs e)
        {
            this.Hide();
        }

        private void ExitButton_Click(object sender, RoutedEventArgs e)
        {
            this.Close();
        }
    }
}
